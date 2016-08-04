import { Rect } from "./javascript/utils";
import { sayHello } from "./greet";

function showHello(divName: string, name: string) {
    var x = [1,2,3].map(n => n + 1);
    const elt = document.getElementById(divName);
    elt.innerText = sayHello(name);
}

showHello("greeting", "TypeScript");
