const express = require("express");
const connectDB = require("./config/db"); // 你的資料庫連線設定
const cors = require("cors");
const mongoose = require("mongoose");

// 引入 Models (資料模型)
const User = require("./models/User");     // 你原本的 User Model
const Canvas = require("./models/Canvas"); // ⚠️ 請確認 models/Canvas.js 已經建立

const app = express();

/* =========================================
   🔧 中間件設定 (Middleware)
   ========================================= */

// 1. 啟用 CORS：允許前端 (localhost:5173 或 3001) 呼叫後端 API
app.use(cors()); 

// 2. 解析 JSON：讓後端看得懂前端傳來的資料
app.use(express.json());

// 3. 連線資料庫
connectDB();

/* =========================================
   🎨 畫布 API (Cognitive Canvas Routes)
   ========================================= */

// [POST] 儲存畫布
app.post("/api/canvas", async (req, res) => {
  try {
    console.log("收到畫布存檔請求:", req.body.title); // 在終端機顯示，方便除錯
    
    // 建立新畫布資料
    const newCanvas = new Canvas({
      title: req.body.title || "未命名畫布",
      // 這裡假設前端會傳來一個叫做 data 的物件，裡面包含 nodes 和 edges
      data: req.body.data 
    });

    const savedCanvas = await newCanvas.save();
    res.status(201).json(savedCanvas);
  } catch (error) {
    console.error("存檔錯誤:", error);
    res.status(500).json({ error: "儲存畫布失敗", details: error.message });
  }
});

// [GET] 讀取所有畫布清單
app.get("/api/canvas", async (req, res) => {
  try {
    // 抓取所有畫布，並按建立時間倒序排列 (最新的在最上面)
    const canvases = await Canvas.find().sort({ createdAt: -1 });
    res.json(canvases);
  } catch (error) {
    console.error("讀取錯誤:", error);
    res.status(500).json({ error: "讀取畫布失敗" });
  }
});

// [GET] 讀取單一畫布 (依 ID)
app.get("/api/canvas/:id", async (req, res) => {
  try {
    const canvas = await Canvas.findById(req.params.id);
    if (!canvas) return res.status(404).json({ error: "找不到該畫布" });
    res.json(canvas);
  } catch (error) {
    res.status(500).json({ error: "讀取單一畫布失敗" });
  }
});

/* =========================================
   👤 用戶 API (你原本的 User Routes)
   ========================================= */

app.post("/api/users", async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "error", message: error.message, errors: error.errors });
    }
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "查詢失敗", detail: err });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "找不到該用戶" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "查詢單一用戶失敗", detail: err });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ error: "找不到要更新的用戶" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "更新失敗", detail: err });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "找不到要刪除的用戶" });
    res.json({ message: "用戶已刪除" });
  } catch (err) {
    res.status(500).json({ error: "刪除失敗", detail: err });
  }
});

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API 伺服器正在運行：http://localhost:${PORT}`);
  console.log(`📡 等待前端連線中...`);
});