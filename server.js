const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");


const serviceAccount = require("./e-shop-22234-firebase-adminsdk-ct4f8-86660f8fc1.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());
const usersCollection = db.collection("users");

app.get("/api/users", async (req, res) => {
    try {
        const usersRef = db.collection("users");
        const snapshot = await usersRef.get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({
                id: doc.id,
                data: doc.data()
            });
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const categoriesRef = db.collection("categories");
        const snapshot = await categoriesRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "No categories found" });
        }

        const products = [];
        snapshot.forEach(doc => {
            const categoryData = doc.data();

            if (categoryData.items && Array.isArray(categoryData.items)) {
                const { title, items } = categoryData;
                items.forEach(item => {
                    const productWithCategory = { ...item, title };
                    products.push(productWithCategory);
                });
            }
        });

        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});


app.post("/api/users", async (req, res) => {
    try {
        const userData = req.body;
        const docRef = await usersCollection.add(userData);
        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error("Error adding user: ", error);
        res.status(500).json({ error: "Failed to add user" });
    }
});

app.get("/api/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const userDoc = await usersCollection.doc(userId).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: "User not found" });
        } else {
            res.json({ id: userDoc.id, data: userDoc.data() });
        }
    } catch (error) {
        console.error("Error getting user:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const newData = req.body; // Received data is already in object format
        console.log(newData); // Log the received data to ensure it's correct

        // Assuming usersCollection is your database collection
        await usersCollection.doc(userId).update(newData);

        res.json({ message: "User updated successfully" });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});


app.delete("/api/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        await usersCollection.doc(userId).delete();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// Create a new product
app.post("/api/products/:categoryTitle", async (req, res) => {
    try {
        const categoryTitle = req.params.categoryTitle.toLowerCase();
        const productData = req.body;

        // Get the reference to the document in the "categories" collection
        const categoryRef = db.collection("categories").doc(categoryTitle);
        const categoryDoc = await categoryRef.get();

        if (!categoryDoc.exists) {
            return res.status(404).json({ error: "Category not found" });
        }

        await categoryRef.update({
            items: admin.firestore.FieldValue.arrayUnion(productData)
        });

        res.status(201).json({ message: "Product added successfully" });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ error: "Failed to add product" });
    }
});



// Update a product
app.put("/api/products/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const newData = req.body;
        await db.collection("products").doc(productId).update(newData);
        res.json({ message: "Product updated successfully" });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Failed to update product" });
    }
});

// Delete a product
app.delete("/api/products/:categoryTitle/:itemId", async (req, res) => {
    try {
        const { categoryTitle, itemId } = req.params;

        const categoryRef = await db.collection("categories").where("title", "==", categoryTitle).get();

        if (categoryRef.empty) {
            return res.status(404).json({ error: `Category with title '${categoryTitle}' not found` });
        }

        let categoryId;
        categoryRef.forEach(doc => {
            categoryId = doc.id;
        });

        // Get the category document by its ID
        const categoryDoc = await db.collection("categories").doc(categoryId).get();

        if (!categoryDoc.exists) {
            return res.status(404).json({ error: `Category with title '${categoryTitle}' not found` });
        }

        // Get the items array from the category document
        const items = categoryDoc.data().items;

        // Find the index of the item with the given ID
        const index = items.findIndex(item => item.id === parseInt(itemId));

        if (index === -1) {
            return res.status(404).json({ error: `Item with ID '${itemId}' not found in category '${categoryTitle}'` });
        }

        // Remove the item from the items array
        items.splice(index, 1);

        // Update the category document with the modified items array
        await db.collection("categories").doc(categoryId).update({ items });

        res.json({ message: `Item with ID '${itemId}' removed from category '${categoryTitle}'` });
    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).json({ error: "Failed to remove item" });
    }
});


app.get("/api/categories", async (req, res) => {
    try {
        const categoriesRef = db.collection("categories");
        const snapshot = await categoriesRef.get();
        const categoryNames = snapshot.docs.map(doc => doc.id);
        res.json(categoryNames);
    } catch (error) {
        console.error("Error fetching category names:", error);
        res.status(500).json({ error: "Failed to fetch category names" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
