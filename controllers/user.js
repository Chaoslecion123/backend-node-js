const fs = require("fs");
const path = require("path");
const jwt = require("../services/jwt");
const User = require("../models/user");
const bcrypt = require("bcrypt");



async function updateUser(req, res) {
    let userData = req.body;
    userData.email = req.body.email.toLowerCase();
    const params = req.params;
  
    if (userData.password) {
      await bcrypt.hash(userData.password, 10,(err, hash) => {
        if (err) {
          res.status(500).send({ message: "Error al encriptar la contraseña." });
        } else {
          userData.password = hash;
        }
      });
    }
  
    User.findByIdAndUpdate({ _id: params.id }, userData, (err, userUpdate) => {
      if (err) {
        res.status(500).send({ message: "Error del servidor." });
      } else {
        if (!userUpdate) {
          res
            .status(404)
            .send({ message: "No se ha encontrado ningun usuario." });
        } else {
          res.status(200).send({ message: "Usuario actualizado correctamente." });
        }
      }
    });
  }

module.exports = {
    updateUser,
};