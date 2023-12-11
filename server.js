const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const UsersConectedNow = {};
const existingCubesData = [];

wss.on('connection', (ws) => {
    // Manejar mensajes desde el cliente
    ws.on('message', (message) => {
      const data = JSON.parse(message);
  
      if (data.type === 'userInfo') {
        // Generar un nuevo ID de usuario
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        const userId = generateUUID();
        console.log("User connected to server, id: "+ userId);
  
        
  
        //Añadir nuevo usuario conectado
        UsersConectedNow[userId] = { ws: ws, userName: data.user};
        // Enviar la nueva información de usuario al cliente
         // Enviar la nueva información de usuario al cliente, incluyendo datos de cubos existentes
        

 
        ws.send(JSON.stringify({
             type: 'FirstInfo',
             userId,
             conections: Object.keys(UsersConectedNow).length,
             userName: UsersConectedNow[userId].userName,
            // existingCubes: existingCubesData
        }));
        // // Enviar la ubicación y color actual del cubo al nuevo cliente
        // ws.send(JSON.stringify({ type: 'currentLocation', userId, location: cubes[userId].location, color: cubes[userId].color }));
  
        // Enviar un mensaje de conexión a todos los clientes
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
           client.send(JSON.stringify({ type: 'userDesConnected', userId, conections: Object.keys(UsersConectedNow).length }));
           console.log("userDesConnected:  users connect now: "+ userId);
          }
        });

      }else if(data.type === 'NewMessage'){
        console.log("NewMessageUser:  new message user: "+ data.type);

        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
             let message =  data.message;
           
             let username = "";
             Object.keys(UsersConectedNow).forEach((userId) => {
                if (UsersConectedNow[userId].ws === ws) {
                    console.log("userName: "+UsersConectedNow[userId].userName);
                    username = UsersConectedNow[userId].userName;
                    console.log("user nsmeeee "+userId);
                }
             });

             client.send(JSON.stringify({ type: 'NewMessageUser', username: username, message: message, conections: Object.keys(UsersConectedNow).length }));
             console.log("NewMessageUser:  new message user: "+ data.message); 
            }
        });
      }else if(data.type === 'DataUserCube'){
         // Al recibir la información del usuario al conectarse, inicializar el cubo
        // guardarlos datos del cubo del usuario recien conectado y enviarle un array con los cubos conectados anteriormente
        Object.keys(UsersConectedNow).forEach((userId) => {
            //usuario recien creado encontrado
            if (UsersConectedNow[userId].ws === ws) {
                const user = UsersConectedNow[userId];
                existingCubesData.push({
                    CubeId: userId,
                    location: data.location,
                    color: data.color
                });
                //devulves un array con los cubos que hay actualmente
                ws.send(JSON.stringify({ type: 'BeforeUserCube',  existingCubes: existingCubesData, conections: Object.keys(UsersConectedNow).length }));
            }
        });


        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                let color = data.color;
                let location = data.location;

                let CubeId = "";//data.userId;
                Object.keys(UsersConectedNow).forEach((userId) => {
                    if (UsersConectedNow[userId].ws === ws) {
                        console.log("userName: "+UsersConectedNow[userId].userName);
                        UsersConectedNow[userId].location = data.location;
                        UsersConectedNow[userId].color = data.color;
                        CubeId = userId;
                    }
                });
                //enviamos la ubicacion del nuevo cubo creado a los demas usuarios
                client.send(JSON.stringify({ type: 'NewCubeUser', location: location, CubeId : CubeId, color: color, conections: Object.keys(UsersConectedNow).length }));
            }
        })
      }else if(data.type === 'UpdateDataUser'){
        //console.log("UpdateDataUser"+ data.userId + " , new location "+ data.location);
        // enviar a los demas usuarios la nueva locaclizacion y la id del usuario. 
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'UpdateLoactionCube', CubeId: data.userId, NewPosition:  data.location}));
            }
        });
        // actualizar el array donde guardamos la location de los usuarios.
        // Update the array where we store the location of the users
        const indexToUpdate = existingCubesData.findIndex(cube => cube.CubeId === data.userId);

        if (indexToUpdate !== -1) {
            // If the user is found in the existingCubesData array, update the location
            existingCubesData[indexToUpdate].location = data.location;
        } 
      }
    });
  
    // Manejar la desconexión del usuario
    ws.on('close', () => {
        
        // Maneja la desconexión del usuario y actualiza la lista de usuarios conectados
        Object.keys(UsersConectedNow).forEach((userId) => {
            if (UsersConectedNow[userId].ws === ws) {
                delete UsersConectedNow[userId];

                const indexToRemove = existingCubesData.findIndex(cube => cube.CubeId === userId);
            
                // Remove the disconnected user's cube from existingCubesData
                if (indexToRemove !== -1) {
                    existingCubesData.splice(indexToRemove, 1);
                }

                broadcastConnectionCount(userId);
                console.log("user disconected "+userId);
            }
        });
    });
});

function broadcastConnectionCount(userId) {
    const conections = Object.keys(UsersConectedNow).length;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userDesConnected', conections, CubeId: userId }));
        }
    });
}

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
// Obtener el dominio del proveedor si está disponible
const domain = process.env.PROVIDER_DOMAIN || 'localhost';
server.listen(PORT, () => {
  console.log(`Server running on http://${domain}:${PORT}`);
});

app.get('/', (req, res) => {
    res.send('<h1>Deploy correcto en ${domain}:${PORT}</h1>');
});


