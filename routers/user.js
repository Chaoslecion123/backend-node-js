const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const User = require('../models/user');
const jwt = require('../services/jwt');
const multipart = require('connect-multiparty');
const UserController = require("../controllers/user");



const md_auth = require("../middlewares/authenticated");
const md_upload_avatar = multipart({uploadDir:"./uploads/avatar"});
const api = express();


api.post('/register',(req,res)=>{
    const user = new User();

    const { nombres, apellidos, email,telefono ,password, repeatPassword } = req.body;
    user.nombres = nombres;
    user.apellidos = apellidos;
    user.email = email.toLowerCase();
    user.telefono = telefono;
    user.active = false;

  
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

api.put('/upload-avatar/:id',[md_auth.ensureAuth,md_upload_avatar],(req,res)=>{
  const params = req.params;

  User.findById({ _id: params.id }, (err, userData) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor." });
    } else {
      if (!userData) {
        res.status(404).send({ message: "Nose ha encontrado ningun usuario." });
      } else {
        let user = userData;

        if (req.files) {
          let filePath = req.files.avatar.path;
          let fileSplit = filePath.split("/");
          let fileName = fileSplit[2];

          let extSplit = fileName.split(".");
          let fileExt = extSplit[1];

          if (fileExt !== "png" && fileExt !== "jpg") {
            res.status(400).send({
              message:
                "La extension de la imagen no es valida. (Extensiones permitidas: .png y .jpg)"
            });
          } else {
            user.avatar = fileName;
            User.findByIdAndUpdate(
              { _id: params.id },
              user,
              (err, userResult) => {
                if (err) {
                  res.status(500).send({ message: "Error del servidor." });
                } else {
                  if (!userResult) {
                    res
                      .status(404)
                      .send({ message: "No se ha encontrado ningun usuario." });
                  } else {
                    res.status(200).send({ avatarName: fileName });
                  }
                }
              }
            );
          }
        }
      }
    }
  });

})

api.get('/get-avatar/:avatarName',(req,res)=>{
  const avatarName = req.params.avatarName;
  const filePath = "./uploads/avatar/" + avatarName;

  fs.exists(filePath,exists => {
    if(!exists){
      res.status(404).send({message:"el avatar que buscas no existe."});
    }else {
      res.sendFile(path.resolve(filePath));
    }
  })
});

api.put("/update-user/:id", [md_auth.ensureAuth], UserController.updateUser);

api.put("/activate-user/:id",[md_auth.ensureAuth],(req,res)=>{
  const { id } = req.params;
  const { active } = req.body;

  User.findByIdAndUpdate(id, { active }, (err, userStored) => {
    if(err) {
      res.status(500).send({ message: "Error del servidor." });
    } else {
      if (!userStored) {
        res.status(404).send({ message: "No se ha encontrado el usuario." });
      } else {
        if (active === true) {
          res.status(200).send({ message: "Usuario activado correctamente." });
        } else {
          res.status(200).send({ message: "Usuario desactivado correctamente." });
        }
      }
    }
  });
});

api.delete("/delete-user/:id",[md_auth.ensureAuth],(req,res)=>{
  const { id } = req.params;

  User.findByIdAndRemove(id, (err, userDeleted) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor." });
    } else {
      if (!userDeleted) {
        res.status(404).send({ message: "Usuario no encontrado." });
      } else {
        res
          .status(200)
          .send({ message: "El usuario ha sido eliminado correctamente." });
      }
    }
  });
});

api.post("/sign-up-admin",[md_auth.ensureAuth],(req,res)=>{
  const user = new User();

  const { nombres, apellidos, email , password } = req.body;
  user.nombres = nombres;
  user.apellidos = apellidos;
  user.email = email.toLowerCase();
  // user.role = role;
  user.active = true;

  if (!password) {
    res.status(500).send({ message: "La contraseña es obligatoria. " });
  } else {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        res.status(500).send({ message: "Error al encriptar la contraseña." });
      } else {
        user.password = hash;

        user.save((err, userStored) => {
          if (err) {
            res.status(500).send({ message: "El usuario ya existe." });
          } else {
            if (!userStored) {
              res
                .status(500)
                .send({ message: "Error al crear el nuevo usuario." });
            } else {
              // res.status(200).send({ user: userStored });
              res
                .status(200)
                .send({ message: "Usuario creado correctamente." });
            }
          }
        });
      }
    });
  }
});


module.exports = api;
