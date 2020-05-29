const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchame = Schema({
  nombres: String,
  apellidos: String,
  email: {
    type: String,
    unique: true
  },
  password: String,
  telefono: String,
  active:Boolean,
  avatar:String
});

module.exports = mongoose.model("User", UserSchame);