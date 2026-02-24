const mongoose = require("mongoose");

const connectDB = async () => {
   try {
    await mongoose.connect("mongodb://localhost:27017/mydatabase"); 
    console.log("已成功連接 MongoDB");
  } catch (err) {
    console.error("MongoDB 連線失敗：", err);
    process.exit(1);
  }
};

module.exports = connectDB;