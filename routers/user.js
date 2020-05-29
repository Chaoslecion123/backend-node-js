const express = require("express");
const api = express();
const bcrypt = require("bcrypt");
const User = require('../models/user');
const jwt = require('../services/jwt');
const md_auth = require("../middlewares/authenticated");

api.post('/register',(req,res)=>{
    const user = new User();

    const { nombres, apellidos, email,telefono ,password, repeatPassword } = req.body;
    user.nombres = nombres;
    user.apellidos = apellidos;
    user.email = email.toLowerCase();
    user.telefono = telefono;
    user.active = false;

    console.log(req.body)
  
    if (!password || !repeatPassword) {
      res.status(404).send({ message: "Las contraseñas son obligatorias." });
    } else {
      if (password !== repeatPassword) {
        res.status(404).send({ message: "Las contraseñas no son iguales." });
      } else {
        bcrypt.hash(password, 10, function(err, hash) {
          if (err) {
            res
              .status(500)
              .send({ message: "Error al encriptar la contraseña." });
          } else {
            user.password = hash;
  
            user.save((err, userStored) => {
              if (err) {
                res.status(500).send({ message: "El usuario ya existe." });
              } else {
                if (!userStored) {
                  res.status(404).send({ message: "Error al crear el usuario." });
                } else {
                  res.status(200).send({ user: userStored });
                }
              }
            });
          }
        });
      }
    }
})

api.post('/login',(req,res)=>{
    const params = req.body;
    const email = params.email.toLowerCase();
    const password = params.password;

    User.findOne({ email }, (err, userStored) => {
        if (err) {
        res.status(500).send({ message: "Error del servidor." });
        } else {
        if (!userStored) {
            res.status(404).send({ message: "Usuario no encontrado." });
        } else {
            bcrypt.compare(password, userStored.password, (err, check) => {
            if (err) {
                res.status(500).send({ message: "Error del servidor." });
            } else if (!check) {
                res.status(404).send({ message: "La contraseña es incorrecta." });
            } else {
                res.status(200).send({
                    accessToken: jwt.createAccessToken(userStored),
                    refreshToken: jwt.createRefreshToken(userStored)
                });
                }
            });
        }
        }
    });
})

api.put('/update-user/:id',[md_auth.ensureAuth],(req,res)=>{
  let userData = req.body;
  userData.email = req.body.email.toLowerCase();
  const params = req.params;

  console.log(userData)

  /* if (userData.password) {
    bcrypt.hash(userData.password, null, null, (err, hash) => {
      if (err) {
        res.status(500).send({ message: "Error al encriptar la contraseña." });
      } else {
        userData.password = hash;
      }
    });
  } */

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
})

api.get('/users',[md_auth.ensureAuth],(req,res)=>{
  User.find().then(users => {
    if (!users) {
      res.status(404).send({ message: "No se ha encontrado ningun usuario." });
    } else {
      res.status(200).send({ users });
    }
  });
})

api.get('/users-active',[md_auth.ensureAuth],(req,res)=>{
  const query = req.query;

  User.find({active: query.active}).then(users => {
    if (!users) {
      res.status(404).send({ message: "No se ha encontrado ningun usuario." });
    } else {
      res.status(200).json({ 
        users:users
      });
    }
  });
  
})

module.exports = api;
