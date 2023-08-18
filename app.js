// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

// Create an Express app
const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Parse incoming requests with URL-encoded payloads
app.use(bodyParser.urlencoded({
    extended: true
}));

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Connect to the MongoDB database 'todolistDB'
mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
    useNewUrlParser: true
});

// Define the schema for individual to-do list items
const itemsSchema = new mongoose.Schema({
    name: String
});

// Create a model for individual to-do list items
const Item = mongoose.model("Item", itemsSchema);

// Create initial to-do list items
const item1 = new Item({
    name: "Welcome to your to-do list!"
});

const item2 = new Item({
    name: "Hit + button to add new items"
});

const item3 = new Item({
    name: "<-- Hit this to delete an item"
});

// Store the initial to-do list items in an array
const defaultItems = [item1, item2, item3];

// Define the schema for custom to-do lists
const listsSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

// Create a model for custom to-do lists
const List = mongoose.model("List", listsSchema);

// Define the root route (home page)
app.get("/", function (req, res) {

    // Check if there are any existing to-do list items
    Item.find().then((foundItems) => {

        if (foundItems.length === 0) {
            // Insert the default to-do list items into the database if none exist
            Item.insertMany(defaultItems).then(function () {
                console.log("Data inserted") // Success
            }).catch(function (error) {
                console.log(error) // Failure
            });
            res.redirect("/");
        } else {
            // Render the 'list' view with the existing to-do list items
            res.render("list", {
                listTitle: "Today",
                newListItems: foundItems
            });
        }
    });
});

// Handle the post request for adding a new list item to a particular list
app.post("/", function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    if (listName === "Today") {
        // Create a new item and save it to the database
        const item = new Item({
            name: itemName
        });
        item.save();
        res.redirect("/");
    } else {
        // Find the custom list in the database and add the new item to it
        List.findOne({
                name: listName
            })
            .then((foundList) => {
                if (foundList) {
                    const item = new Item({
                        name: itemName
                    });
                    foundList.items.push(item);
                    foundList.save();
                    res.redirect("/" + listName);
                } else {
                    // If the custom list does not exist, redirect back to the root route
                    res.redirect("/");
                }
            })
            .catch((err) => {
                console.log("Error occurred:", err);
                res.redirect("/");
            });
    }
});

// Handle the post request for deleting a checked item
app.post("/delete", function (req, res) {
    const checkedItemID = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        // Remove the checked item from the default list
        Item.findByIdAndRemove(checkedItemID)
            .then(() => {
                res.redirect("/");
            })
            .catch((err) => {
                console.error(err);
                res.status(500).send("Error deleting item");
            });
    } else {
        // Find the custom list and remove the checked item from it
        List.findOneAndUpdate({
                name: listName
            }, {
                $pull: {
                    items: {
                        _id: checkedItemID
                    }
                }
            })
            .then((doc) => {
                res.redirect("/" + listName);
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: "Can't return post"
                });
            });
    }
});

// Handle the request for generating a custom list
app.get("/:customListName", function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    // Check if the custom list exists in the database
    List.findOne({
            name: customListName
        })
        .then((foundList) => {
            if (foundList) {
                // If the custom list exists, render the 'list' view with its items
                res.render("list", {
                    listTitle: foundList.name,
                    newListItems: foundList.items
                });
            } else {
                // If the custom list does not exist, create it with the default items and redirect to it
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
                list.save();
                res.redirect("/" + customListName);
            }
        })
        .catch((err) => {
            console.log("Error occurred:", err);
        });
});

// Start the server on port 3000
app.listen(3000);
