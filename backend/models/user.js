const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "姓名為必填"]
  },
  email: {
    type: String,
    required: [true, "Email 為必填"],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email 格式不正確"]
  },
  age: {
    type: Number,
    min: [0, "年齡不可小於 0"]
  }
});

module.exports = mongoose.model("User", UserSchema);