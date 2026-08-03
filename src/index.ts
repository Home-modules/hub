import { createUser, users } from "./api-server/auth.ts";
import { init } from "./init.ts";

function main() {
    const param = process.argv[2]
    if(!param)
        init();
    else if(param == 'init') {
        return; // Data files are initialized in module scope. Just let them do it
    }
    else if(param == 'signup') {
        if(Object.keys(users).length) {
            if(process.argv.includes("--force")) {
                for (const username in users) {
                    if (Object.prototype.hasOwnProperty.call(users, username)) {
                        delete users[username];
                    }
                }
            } else {
                console.log("One or more users already exist. Use --force to delete them and create a new admin user.")
                return;
            }
        }
        
        console.log("Creating the first user");
        const username = prompt("Choose a username:")
        if(!username) return;
        const password = prompt("Choose a password:")
        if(!password) return;
        const password2= prompt("Confirm  password:")
        if(!password2) return;

        if(password != password2) {
            console.error("Passwords don't match");
            return;
        }

        createUser(username, password).then(()=> console.log("Done"))
    }
}

if (import.meta.main) { // This file is entry point
    main();
}
