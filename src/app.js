const express = require("express");

const app = express();

app.use(express.json());

let contacts = [];
let currentId = 1;


//Reset para tests
function resetData() {
    contacts = []
    currentId = 1;
}

//Validacion email
function isValidEmail(email) {
    return email.includes("@")
}

//Get todos
app.get("/api/contacts", (req, res) => {
    res.status(200).json(contacts);
})

//Get por id
app.get("/api/contacts/:id", (req,res) => {
    const id = Number(req.params.id);

    const contact = contacts.find((c) => c.id === id);

    if (!contact) {
        return res.status(404).json({ error: "Contacto no encontrado"});
    }

    res.status(200).json(contact);
})

//POST crear
app.post("/api/contacts", (req, res) => {
    const {name, email, phone} = req.body;

    if(!name) {
        return res.status(400).json({ error: "El nombre es requerido"});
    }

    if(!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Email invalido"});
    }

    const newContact = {
        id: currentId++,
        name,
        email,
        phone: phone || "",
    };

    contacts.push(newContact);

    res.status(201).json(newContact);
});

//PUT actualizar 
app.put("/api/contacts/:id", (req, res) => {
    const id = Number(req.params.id);

    const contact = contacts.find((c) => c.id === id);

    if (!contact) {
        return res.status(404).json({ error:"Contacto no encontrado"});
    }

    const {name, email, phone} = req.body;

    if(email && !isValidEmail(email)) {
        return res.status(400).json({ error: "Email invalido"})
    }

    if(name !== undefined) contact.name = name;
    if(email !== undefined) contact.email = email;
    if(phone !== undefined) contact.phone = phone;

    res.status(200).json(contact);
});

//DELETE eliminar 
app.delete("/api/contacts/:id", (req, res) => {
    const id = Number(req.params.id);

    const index = contacts.findIndex((c) => c.id === id);

    if(index === -1){
        return res.status(404).json({ error: "Contacto no encontrado"});
    }

    contacts.splice(index,1);

    res.status(200).json({ message: "Contacto eliminado"});
});

module.exports = {app ,resetData};