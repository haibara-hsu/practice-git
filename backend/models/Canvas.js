// backend/models/Canvas.js
const mongoose = require("mongoose");

const CanvasSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "未命名畫布"
  },
  // 這裡使用 "Mixed" 類型，因為畫布的節點(nodes)和連線(edges)結構可能很複雜
  // 這樣前端傳什麼 JSON 過來，我們就存什麼，最彈性！
  data: {
    type: mongoose.Schema.Types.Mixed, 
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Canvas", CanvasSchema);