const express = require('express');
const sequelize = require('./db');
const { v4: uuidv4 } = require("uuid");
const Gadget = require('./models/Gadget');
const bodyParser = require("body-parser");
const { Op } = require("sequelize");
const app = express();
app.use(express.json());
app.use(bodyParser.json());


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const authenticateToken = require("./authMiddleware");
dotenv.config();
// Sync Database (Auto Create Table)
const users = []; // temporary in memory storage
sequelize.sync()
    .then(() => console.log('Database & table synced!'))
    .catch(err => console.error('Error syncing database:', err));

const generateSuccessProbability = () => Math.floor(Math.random() * 100) + "%";
const randomCodenames = ["The Nightingale", "The Kraken", "The Phoenix", "The Shadow"];
const generateCodename = () => randomCodenames[Math.floor(Math.random() * randomCodenames.length)];
const generateConfirmationCode = () => Math.floor(100000 + Math.random() * 900000).toString();


app.post("/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  
      const hashedPassword = await bcrypt.hash(password, 10);
      users.push({ username, password: hashedPassword });
  
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.log(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
  
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: "Invalid credentials" });
  
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  });




app.get("/gadgets",authenticateToken, async (req, res) => {
    try {
      const { status } = req.query;
  
      // Exclude "Decommissioned" gadgets by default unless status is explicitly set
      const whereClause = status ? { status } : { status: { [Op.not]: "Decommissioned" } };
  
      // Fetch gadgets from the database
      const gadgets = await Gadget.findAll({ where: whereClause });
  
      // Add mission success probability & include "decommissionedAt" if present
      const gadgetsWithProbability = gadgets.map((gadget) => ({
        id: gadget.id,
        name: gadget.name,
        status: gadget.status,
        decommissionedAt: gadget.decommissionedAt || null, // Include decommission date if present
        mission_success_probability: generateSuccessProbability(),
      }));
  
      res.json(gadgetsWithProbability);
    } catch (error) {
      console.error("Error fetching gadgets:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  app.post("/gadgets",authenticateToken , async (req, res) => {
    try {
      const { name } = req.body;
      const codename = name || generateCodename(); // Use provided name or generate a random one
  
      const newGadget = await Gadget.create({
        id: uuidv4(),
        name: codename,
        status: "Available",
      });
  
      // Simulating an external request (Replace with real API if needed)
  
      res.status(201).json(newGadget);
    } catch (error) {
      console.error("Error creating gadget:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  app.patch("/gadgets", authenticateToken,async (req, res) => {
    try {
      const { name } = req.query;
      const { newName, status } = req.body; // Fields to update
  
      // Find the gadget by name
      const gadget = await Gadget.findOne({ where: { name } });
      if (!gadget) {
        return res.status(404).json({ error: "Gadget not found" });
      }
  
      // Update fields if provided
      if (newName) gadget.name = newName; // Allow renaming
      if (status) gadget.status = status;
  
      // Save changes
      await gadget.save();
      res.json({ message: "Gadget updated successfully", gadget });
    } catch (error) {
      res.status(500).json({ error: "Error updating gadget", details: error.message });
    }
  });

  app.delete("/gadgets",authenticateToken, async (req, res) => {
    try {
      const { name } = req.query;
  
      // Find the gadget by name
      const gadget = await Gadget.findOne({ where: { name } });
      if (!gadget) {
        return res.status(404).json({ error: "Gadget not found" });
      }
  
      // Mark as decommissioned
      gadget.status = "Decommissioned";
      gadget.decommissionedAt = new Date(); // Store timestamp
  
      // Save changes
      await gadget.save();
      res.json({ message: "Gadget successfully decommissioned", gadget });
    } catch (error) {
      res.status(500).json({ error: "Error decommissioning gadget", details: error.message });
    }
  });
  
  app.post("/gadgets/:id/self-destruct", authenticateToken,async (req, res) => {
    try {
      const { id } = req.params; // Taking gadget ID from request params
  
      // Find the gadget by ID
      const gadget = await Gadget.findByPk(id);
  
      if (!gadget) {
        return res.status(404).json({ success: false, error: "Gadget not found" });
      }
  
      if (gadget.status === "Destroyed") {
        return res.status(400).json({ success: false, error: "Gadget is already destroyed" });
      }
  
      // Generate a random confirmation code
      const confirmationCode = generateConfirmationCode();
  
      // Update gadget status to "Destroyed"
      await gadget.update({ status: "Destroyed" });
  
      res.json({
        success: true,
        message: `Self-destruct sequence activated for ${gadget.name}`,
        confirmation_code: confirmationCode,
      });
    } catch (error) {
      console.error("Error triggering self-destruct:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
