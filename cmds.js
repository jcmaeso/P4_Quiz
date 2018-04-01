
const Sequalize = require('sequelize');
const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require("./out");

/**
* Muestra la ayuda
*
* @param rl Objetivo readline usado para implementar el CLI.
*/
exports.helpCmd = (socket,rl) => {
	log(socket,"Commandos");
    log(socket," h|help - Muestra esta ayuda.");
    log(socket," list - Listar los quizzes existentes.");
    log(socket," show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log(socket," add - Añadir un nuevo quiz interactivamente.");
    log(socket," delete <id> - Borrar el quiz indicado.");
    log(socket," edit <id> - Editar el quiz indicado.");
    log(socket," test <id> - Probar el quiz indicado.");
    log(socket," p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket," credits - Créditos.");
    log(socket," q|quit - Salir del programa.");
    rl.prompt();
};

/**
* Lista todos los quizzes existentes en el modelo
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.listCmd = (socket,rl) => {
	models.quiz.findAll().then( quizzes => {
		quizzes.forEach((quiz) => {
            log(socket,` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} `);
        });
	}).catch( error => {
		errorlog(socket,error.message)
	}).then(() => {
		rl.prompt();
	});

};

const validateId = (socket,id) =>{
    return new Sequalize.Promise((resolve,reject)=> {
        if(typeof id === "undefined") {
            reject(new Error(`Falta el parametro ID`));
        }else{
            id = parseInt(id);
            if(Number.isNaN(id)){
                reject(new Error(`El valor de del parametro ${id} no es un numero`));
            }else{
                resolve(id);
            }
        }
    });
};

/**
* Muestra el quiz indicador en el parámetro: la pregunta y la respuesta.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a mostrar
*/
exports.showCmd = (socket,rl, id) => {
    validateId(id).then(id => models.quiz.findById(id)).then(quiz => {
            if(!quiz){
                throw new Error(`No existe un quiz asociado al id ${id}`);
            }
            log(socket,` [${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer} `)
    }).catch(error => {
        errorlog(socket,error);
    }).then(() => {
        rl.prompt();
    });
};

/**
* Añade un nuevo quiz al modelo.
*Pregunta interactivamente por la pregunta y por la respuesta.
*
*Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
*El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
*es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
*llamada a rl.question.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
const readQuestion = (socket,rl,text) =>{
    return new Promise((resolve,reject) => {
        rl.question(colorize(text,'red'), answer => {
            resolve(answer.trim());
        })
    })
};


exports.addCmd = (socket,rl) => {
    readQuestion(rl,'Introduzca una pregunta: ').then(q => {
        return readQuestion(rl,"Introduzca una respuesta")
            .then(a=> {
                return {question: q, answer: a};
            });
    }).then(quiz => {
        return models.quiz.create(quiz);
    }).then(quiz => {
        log(socket,` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer} `);
    }).catch(Sequalize.ValidationError, error=> {
        errorlog(`El quiz es erronero`);
        error.errors.forEach(({message}) => errorlog(socket,message));
    }).catch( error => {
        errorlog(socket,error.message);
    }).then(() => {
        rl.prompt();
    })

};

/**
* Borra un quiz del modelo.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/
exports.deleteCmd = (socket,rl, id) => {
        validateId(id).then((id) => models.quiz.destroy({where: {id}})).catch( error => {
            errorlog(socket,error.message);
        }).then(()=>{
            rl.prompt();
        });
};

/**
* Borra un quiz del modelo.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/
exports.editCmd = (socket,rl, id) => {
    validateId(id).then(id => models.quiz.findById(id)).then(quiz => {
        if(!quiz){
            throw new Error("Id erroneo");
        }
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return readQuestion(rl,"Introduzca una pregunta").then(q =>{
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
            return readQuestion(rl,`Introduzca la respuesta`).then( a =>{
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            })
        })
    }).then(quiz=>{
        return quiz.save();
    }).then(quiz => {
        log(socket,` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer} `);
    }).catch(Sequalize.ValidationError, error => {
        errorlog(socket,`El quiz es erroneo`);
        error.errors.forEach(({message}) => errorlog(socket,message));
    }).then( () =>{
        rl.prompt();
    });
};

/**
* Borra un quiz del modelo.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/
exports.testCmd = (socket,rl, id) => {
    //log('Probar el quiz indicado');

    validateId(id).then(id => models.quiz.findById(id)).then(quiz => {
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id ${id}`);
        }
        readQuestion(rl,`${quiz.question}: `).then(ans => {
            if(ans.toUpperCase().trim() === quiz.answer.toUpperCase().trim()){
                log(socket,"Su respuesta es correcta.");
                biglog(socket,'CORRECTA','green');
                rl.prompt();
            }else{
                log(socket,'Su respuesta es incorrecta.');
                biglog(socket,'INCORRECTA', 'red');
                rl.prompt();
            }
        });
    }).catch( error => {
        errorlog(socket,error.message);
    }).then(() => {
        rl.prompt();
    });
};

/**
* Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
* Se gana si se contesta a todos satisfactoriamente.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
const getNumElements = () =>{
};

exports.playCmd = (socket,rl) => {
	let score = 0
	let toBeResolved = [];
    models.quiz.count().then(numOfElements =>{
        for(let i=0; i<numOfElements; i++){
            toBeResolved[i]=i+1;
        }
    }).then(() => {
       return playStart();
    }).then(() => {
        biglog(socket,score,'blue');
        rl.prompt();
    });


	const playStart = () =>{
	    return new Promise((resolve,reject) => {
            if (toBeResolved.length === 0) {
                socket.write(' ¡No hay preguntas que responder!','red');
                socket.write(` Fin del examen. Aciertos: ${score} `);
                resolve();
            }else{
                let id = toBeResolved[Math.floor((Math.random() * toBeResolved.length))];
                toBeResolved.splice(toBeResolved.indexOf(id), 1);
                validateId(id).then(id => models.quiz.findById(id)).then(quiz => {
                    if(!quiz){
                        throw new Error(`No existe un quiz asociado al id ${id}`);

                    }
                    readQuestion(rl,`${quiz.question}: `).then(ans => {
                        if(ans.toUpperCase().trim() === quiz.answer.toUpperCase().trim()){
                            score++;
                            socket.write(`  CORRECTO - Lleva ${score} aciertos`);
                            resolve(playStart());
                        }else{
                            socket.write('  INCORRECTO ');
                            socket.write(`  Fin del juego. Aciertos: ${score} `);
                            resolve();
                        }
                    });
                }).catch(error => {
                    errorlog(socket,error);
                });
            }
        });
	};
};

/**
* Muestra los nombres de los autores de la práctica.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.creditsCmd = (socket,rl) => {
    log(socket,'Autores de la práctica:');
    log(socket,'Isabel Rodríguez Ruiz', 'green');
    log(socket,'Jorge Calatayud Maeso', 'green');
    rl.prompt();
};

/**
* Terminar el programa.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.quitCmd = (socket,rl) => {
	rl.close();
};