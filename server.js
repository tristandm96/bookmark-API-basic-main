import { createServer } from 'http';
import fs from 'fs';
import { json } from 'stream/consumers';

function allowAllAnonymousAccess(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
}
function accessControlConfig(req, res) {
    if (req.headers['sec-fetch-mode'] == 'cors') {
        allowAllAnonymousAccess(res);
        console.log("Client browser CORS check request");
    }
}
function CORS_Preflight(req, res) {
    if (req.method === 'OPTIONS') {
        res.end();
        console.log("Client browser CORS preflight check request");
        return true;
    }
    return false;
}
function extract_Id_From_Request(req) {
    // .../api/ressources/id
    let parts = req.url.split('/');
    return parseInt(parts[parts.length - 1]);
}
function validateContact(contact) {
    if (!('Name' in contact)) return 'Name is missing';
    if (!('Phone' in contact)) return 'Phone is missing';
    if (!('Email' in contact)) return 'Email is missing';
    return '';
}
function validateBookmark(contact) {
    if (!('Title' in contact)) return 'Title is missing';
    if (!('Url' in contact)) return 'Url is missing';
    if (!('Category' in contact)) return 'Category is missing';
    return '';
}
// something here 
async function handleBookmarksServiceRequest(req, res) {

    if (req.url.includes("/api/bookmarks")) {
        let id = extract_Id_From_Request(req);
        const BookmarkFilePath = "./bookmarks.json";
        let bookmarksJson = fs.readFileSync(BookmarkFilePath);
        let bookmarks = JSON.parse(bookmarksJson);

        switch (req.method) {
            case 'GET':
                if (isNaN(id)) {
                    res.writeHead(200, { 'content-type': 'application/json' }); // 200 = ok 
                    res.end(bookmarksJson);
                }
                else {
                    let found = false;
                    for (var bookmark of bookmarks) {
                        if (bookmark.Id === id) {
                            found = true;
                            res.writeHead(200, { 'content-type': 'application/json' });
                            res.end(JSON.stringify(bookmark));
                        }
                    }
                    if (!found) {
                        res.writeHead(404) // 404 = not found error
                        res.end(`Error : The bookmark of id ${id} does not exist`)
                    }
                }
                break;
            case 'POST':
                let newbookmark = await getPayload(req);
                let maxId = 0;
                bookmarks.forEach(bookmark => {
                    if (bookmark.Id > maxId)
                        maxId = bookmark.Id;
                });
                    newbookmark.Id = maxId +1;
                bookmarks.push(newbookmark);
                fs.writeFileSync(BookmarkFilePath, JSON.stringify(bookmarks));
                res.writeHead(201, { 'content-type': 'application/json' }); // created 
                res.end(JSON.stringify(newbookmark));
                break;
            case 'PUT':
                let permutationBoormark = null;
                let updatedBookmark = await getPayload(req);
                if (validateBookmark(updatedBookmark) === '') {
                    if (!isNaN(id)) {
                        if (!('Id ' in updatedBookmark)) updatedBookmark.Id = id;
                        bookmarks.forEach(bookmark => {
                            if (bookmark.Id === id) {
                                permutationBoormark = bookmark;
                            }
                        })
                        if (permutationBoormark !== null) {
                            permutationBoormark.Title = updatedBookmark.Title;
                            permutationBoormark.Url = updatedBookmark.Url;
                            permutationBoormark.Category = updatedBookmark.Category;
                            fs.writeFileSync(BookmarkFilePath, JSON.stringify(bookmarks));
                            res.writeHead(200);
                            res.end();
                        }
                        else {
                            res.writeHead(404)
                            res.end(`Error: The bookmark with id ${id} does not exist.`)
                        }
                    }
                    else {

                        res.writeHead(400) // bad request 
                        res.end(`Error: The bookmark Id is required`)
                    }
                }
                else {
                    res.writeHead(400);
                    res.end(`Error: The bookmark is invalide ${validateBookmark(updatedBookmark)}`)
                }
                break;
            case 'DELETE':
                 let index = 0;
                 if(!isNaN(id)){
               for (let bookmark of bookmarks){
                        if (bookmark.Id === id) {
                            bookmarks.splice(index,1)
                            fs.writeFileSync(BookmarkFilePath,JSON.stringify(bookmarks))
                            res.writeHead(200);
                            res.end();
                            break; 
                        }
                       index++;
                    }
                 }
                 else {
                    res.writeHead(400) // bad request 
                    res.end(`Error: The bookmark Id is required`)
                }
                break;
        }

    }}
    async function handleContactsServiceRequest(req, res) {
        if (req.url.includes("/api/contacts")) {
            const contactsFilePath = "./contacts.json";
            let contactsJSON = fs.readFileSync(contactsFilePath);
            let contacts = JSON.parse(contactsJSON);
            let validStatus = '';
            let id = extract_Id_From_Request(req);
            switch (req.method) {
                case 'GET':
                    if (isNaN(id)) {
                        res.writeHead(200, { 'content-type': 'application/json' });
                        res.end(contactsJSON);
                    } else {
                        let found = false;
                        for (let contact of contacts) {
                            if (contact.Id === id) {
                                found = true;
                                res.writeHead(200, { 'content-type': 'application/json' });
                                res.end(JSON.stringify(contact));
                                break;
                            }
                        }
                        if (!found) {
                            res.writeHead(404);
                            res.end(`Error : The contact of id ${id} does not exist`);
                        }
                    }
                    break;
                case 'POST':
                    let newContact = await getPayload(req);
                    validStatus = validateContact(newContact);
                    if (validStatus == '') {
                        let maxId = 0;
                        contacts.forEach(contact => {
                            if (contact.Id > maxId)
                                maxId = contact.Id;
                        });
                        newContact.Id = maxId + 1;
                        contacts.push(newContact);
                        fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                        res.writeHead(201, { 'content-type': 'application/json' });
                        res.end(JSON.stringify(newContact));
                    } else {
                        res.writeHead(400);
                        res.end(`Error: ${validStatus}`);
                    }
                    break;
                case 'PUT':
                    let modifiedContact = await getPayload(req);
                    validStatus = validateContact(modifiedContact);
                    if (validStatus == '') {
                        if (!isNaN(id)) {
                            if (!('Id' in modifiedContact)) modifiedContact.Id = id;
                            if (modifiedContact.Id == id) {
                                let storedContact = null;
                                for (let contact of contacts) {
                                    if (contact.Id === id) {
                                        storedContact = contact;
                                        break;
                                    }
                                }
                                if (storedContact != null) {
                                    storedContact.Name = modifiedContact.Name;
                                    storedContact.Phone = modifiedContact.Phone;
                                    storedContact.Email = modifiedContact.Email;
                                    fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                                    res.writeHead(200);
                                    res.end();
                                } else {
                                    res.writeHead(404);
                                    res.end(`Error: The contact of id ${id} does not exist.`);
                                }
                            } else {
                                res.writeHead(409);
                                res.end(`Error: Conflict of id`);
                            }
                        } else {
                            res.writeHead(400);
                            res.end("Error : You must provide the id of contact to modify.");
                        }
                    } else {
                        res.writeHead(400);
                        res.end(`Error: ${validStatus}`);
                    }
                    break;
                case 'DELETE':
                    if (!isNaN(id)) {
                        let index = 0;
                        let oneDeleted = false;
                        for (let contact of contacts) {
                            if (contact.Id === id) {
                                contacts.splice(index, 1);
                                fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                                oneDeleted = true;
                                break;
                            }
                            index++;
                        }
                        if (oneDeleted) {
                            res.writeHead(204); // success no content
                            res.end();
                        } else {
                            res.writeHead(404);
                            res.end(`Error: The contact of id ${id} does not exist.`);
                        }
                    } else {
                        res.writeHead(400);
                        res.end("Error : You must provide the id of contact to delete.");
                    }
                    break;
                case 'PATCH':
                    res.writeHead(501);
                    res.end("Error: The endpoint PATCH api/contacts is not implemented.");
                    break;
            }
            return true;
        }
        return false;
    }

    function handleRequest(req, res) {
        return handleBookmarksServiceRequest(req, res);
    }

    function getPayload(req) {
        return new Promise(resolve => {
            let body = [];
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                if (body.length > 0)
                    if (req.headers['content-type'] == "application/json")
                        try { resolve(JSON.parse(body)); }
                        catch (error) { console.log(error); }
                resolve(null);
            });
        })
    }

    const server = createServer(async (req, res) => {
        console.log(req.method, req.url);
        accessControlConfig(req, res);
        if (!CORS_Preflight(req, res))
            if (!handleRequest(req, res)) {
                res.writeHead(404);
                res.end();
            }
    });
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

