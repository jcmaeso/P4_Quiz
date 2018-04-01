//Sockets modules
const net = require('net');
const port = (3030);
const readline = require('readline');
const cmds = require('./cmds');
const {log, biglog, errorlog, colorize} = require("./out");


let server = net.createServer(socket => {

    console.log(`Se ha conectado un cliente desde: ${socket.remoteAddress}`);

    const rl = readline.createInterface({
        input: socket,
        output: socket,
        prompt: colorize("quiz >", 'blue'),
        completer: (line) => {
            const completions = 'h help add delete edit list test p play credits q quit'.split(' ');
            const hits = completions.filter((c) => c.startsWith(line));
            return [hits.length ? hits : completions, line];
        }
    });

    biglog(socket,'CORE Quiz', 'green');

    rl.prompt();

    rl.on('line', (line) => {

        let args = line.split(" ");
        let cmd = args[0].toLowerCase().trim();

        switch (cmd) {
            case '':
                rl.prompt();
                break;
            case 'h':
            case 'help':
                cmds.helpCmd(socket, rl);
                break;
            case 'quit':
            case 'q':
                cmds.quitCmd(socket, rl);
                break;
            case 'add':
                cmds.addCmd(socket, rl);
                break;
            case 'list':
                cmds.listCmd(socket, rl);
                break;
            case 'show':
                cmds.showCmd(socket, rl, args[1]);
                break;
            case 'test':
                cmds.testCmd(socket, rl, args[1]);
                break;
            case 'play':
            case 'p':
                cmds.playCmd(socket, rl);
                break;
            case 'delete':
                cmds.deleteCmd(socket, rl, args[1]);
                break;
            case 'edit':
                cmds.editCmd(socket, rl, args[1]);
                break;
            case 'credits':
                cmds.creditsCmd(socket, rl);
                break;

            default:
                log(socket, `Comando desconocido: '${colorize(cmd, 'red')}'`);
                log(socket, `Use ${colorize('help', 'green')} para ver todos los comandos disponibles.`);
                rl.prompt();
                break;
        }
    });

    socket.on('error', () => {
        rl.close();
    });

    socket.on('end', had_error =>{
        rl.close();
       if(had_error) {
           console.log("error in socket");
           return;
       }
       socket.write(log('Adios!'));
    });
});


server.listen(3030);




