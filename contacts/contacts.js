const express = require("express");
const morgan = require("morgan");
const app = express();

const MAX_CHARS_FOR_NAMES = 25;

let nonAlphabeticRegex = new RegExp("[^a-z]", "gi");
let nonNumberRegex = new RegExp("[^0-9]", "g");

let duplicateName = newContact => {
  return contactData.some(contact => {
    return ((contact.firstName === newContact.firstName) && 
        (contact.lastName === newContact.lastName));
    });
}

let validName = (name, fullName) => {
  return (name.length > 0) &&
         (name.length <= MAX_CHARS_FOR_NAMES) &&
         !(nonNumberRegex.test(name)) &&
         !duplicateName(fullName);
}

let validPhone = phone => {
  return (phone.length === 10) &&
         !(nonAlphabeticRegex.test(phone));
}

function getVariables(req, res) {
  let variables = {
    errorMessages: res.locals.errorMessages
  }

  if (!duplicateName({
    firstName: req.body.firstName,
    lastName: req.body.lastName
  })) {
    if (validName(req.body.firstName)) {
      variables.firstName = req.body.firstName;
    }
  
    if (validName(req.body.lastName));
      variables.lastName = req.body.lastName;
    }

  if (validPhone(req.body.phoneNumber)) {
    variables.phoneNumber = req.body.phoneNumber;
  }

  return variables;
}

let contactData = [
  {
    firstName: "Mike",
    lastName: "Jones",
    phoneNumber: "281-330-8004",
  },
  {
    firstName: "Jenny",
    lastName: "Keys",
    phoneNumber: "768-867-5309",
  },
  {
    firstName: "Max",
    lastName: "Entiger",
    phoneNumber: "214-748-3647",
  },
  {
    firstName: "Alicia",
    lastName: "Keys",
    phoneNumber: "515-489-4608",
  },
];

const sortContacts = contacts => {
  return contacts.slice().sort((contactA, contactB) => {
    if (contactA.lastName < contactB.lastName) {
      return -1;
    } else if (contactA.lastName > contactB.lastName) {
      return 1;
    } else if (contactA.firstName < contactB.firstName) {
      return -1;
    } else if (contactA.firstName > contactB.firstName) {
      return 1;
    } else {
      return 0;
    }
  });
};



app.set("views", "./views");
app.set("view engine", "pug");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(morgan("common"));

app.get("/", (req, res) => {
  res.redirect("/contacts");
});

app.get("/contacts", (req, res) => {
  res.render("contacts", {
    contacts: sortContacts(contactData),
  });
});

app.get("/contacts/new", (req, res) => {
  res.render("contact-form");
});

app.post("/contacts/new",
  (req, res, next) => {
    res.locals.errorMessages = [];
    next();
  },
  (req, res, next) => {
    let fName = req.body.firstName;
    
    req.body.firstName = fName.trim();

    if (fName.length === 0) {
      res.locals.errorMessages.push("First name is required.");
    } else if (fName.length > MAX_CHARS_FOR_NAMES) {
      res.locals.errorMessages.push(`First name must contain fewer than ${MAX_CHARS_FOR_NAMES} characters.`);
    } else if (nonAlphabeticRegex.test(fName)) {
      res.locals.errorMessages.push(`First name contains invalid characters.`);     
    }

    next();
  },
  (req, res, next) => {
    req.body.lastName = req.body.lastName.trim();
    
    if (req.body.lastName.length === 0) {
      res.locals.errorMessages.push("Last name is required.");
    } else if (req.body.firstName.length > MAX_CHARS_FOR_NAMES) {
      res.locals.errorMessages.push(`Last name must contain fewer than ${MAX_CHARS_FOR_NAMES} characters.`);
    } else if (nonAlphabeticRegex.test(req.body.lastName)) {
      res.locals.errorMessages.push(`Last name contains invalid characters.`);     
    }

    next();
  },
  (req, res, next) => {
    let userPhone = req.body.phoneNumber.trim()
    
    if (userPhone.length === 0) {
      res.locals.errorMessages.push("Phone number is required.");
    } else if (nonNumberRegex.test(userPhone) || userPhone.length !== 10) {
      res.locals.errorMessages.push(`Invalid phone number`);     
    } else {
      req.body.phoneNumber = userPhone;
    }
    next();
  },
  (req, res, next) => {
    if (duplicateName({
      firstName: req.body.firstName,
      lastName: req.body.lastName
    })) {
      res.locals.errorMessages.push('Contact already exists in database.');   
    }

    next();
  },
  (req, res, next) => {
    if (res.locals.errorMessages.length > 0) {
      res.render("contact-form", getVariables(req, res));
    } else {
      next();
    }
  },
  (req, res) => {
    contactData.push({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
    });

    res.redirect("/contacts");
  }
);

app.listen(3000, "localhost", () => {
  console.log("Listening to port 3000.");
});