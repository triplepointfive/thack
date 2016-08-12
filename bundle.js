(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
const utils_1 = require("./utils");
const walker_1 = require("./creature/walker");
exports.Walker = walker_1.Walker;
class TileRecall {
    constructor() {
        this.seen = false;
        this.tangible = false;
        this.visible = false;
        this.updated = false;
    }
}
exports.TileRecall = TileRecall;
const leePath = function (walker, destination) {
    let stageMemory = utils_1.twoDimArray(utils_1.MAX_X, utils_1.MAX_Y, () => { return undefined; });
    let pointsToVisit = [];
    let pointsToCheck = [{ x: walker.x, y: walker.y }];
    let step = 0;
    while (pointsToCheck.length && !pointsToVisit.length) {
        let wavePoints = [];
        pointsToCheck.forEach((point) => {
            if (walker.stageMemory[point.x][point.y].tangible ||
                stageMemory[point.x][point.y] !== undefined) {
                return;
            }
            stageMemory[point.x][point.y] = step;
            if (destination(point.x, point.y)) {
                pointsToVisit.push(point);
            }
            else {
                wavePoints.push({ x: point.x - 1, y: point.y });
                wavePoints.push({ x: point.x + 1, y: point.y });
                wavePoints.push({ x: point.x, y: point.y - 1 });
                wavePoints.push({ x: point.x, y: point.y + 1 });
                wavePoints.push({ x: point.x - 1, y: point.y - 1 });
                wavePoints.push({ x: point.x + 1, y: point.y - 1 });
                wavePoints.push({ x: point.x + 1, y: point.y + 1 });
                wavePoints.push({ x: point.x - 1, y: point.y + 1 });
            }
        });
        step++;
        pointsToCheck = wavePoints;
    }
    if (pointsToVisit.length) {
        pointsToVisit[Math.floor(Math.random() * pointsToVisit.length)];
        return buildRoad(pointsToVisit[0], stageMemory);
    }
    else {
        return [];
    }
};
exports.leePath = leePath;
const buildRoad = function (point, stageMemory) {
    let x0 = point.x, y0 = point.y;
    let chain = [{ x: x0, y: y0 }];
    let delta = undefined;
    while (stageMemory[x0][y0] !== 0) {
        delta = [
            { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: -1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
        ].find((dp) => {
            return stageMemory[x0 + dp.x] &&
                (stageMemory[x0 + dp.x][y0 + dp.y] === stageMemory[x0][y0] - 1);
        });
        x0 += delta.x;
        y0 += delta.y;
        chain.unshift({ x: x0, y: y0 });
    }
    return chain;
};

},{"./creature/walker":4,"./utils":8}],2:[function(require,module,exports){
"use strict";
const ai_1 = require("../ai");
const patrol_1 = require("./patrol");
const logger_1 = require("../logger");
const NEW_POINT_EVERY = 10;
class Explorer {
    constructor(patrol = undefined) {
        this.patrol = patrol;
        this.path = [];
        this.step = NEW_POINT_EVERY;
    }
    act(walker) {
        this.updatePatrol(walker);
        if (!this.path.length) {
            this.buildNewPath(walker);
            if (this.path.length) {
                this.act(walker);
            }
            else {
                logger_1.Logger.info("I'm done, time to patrol");
                walker.ai = this.patrol;
            }
        }
        else {
            const nextPoint = this.path.shift();
            if (walker.stageMemory[nextPoint.x][nextPoint.y].tangible) {
                this.path = [];
                this.act(walker);
            }
            else {
                walker.x = nextPoint.x;
                walker.y = nextPoint.y;
            }
        }
    }
    buildNewPath(walker) {
        this.path = ai_1.leePath(walker, (x, y) => {
            return !walker.stageMemory[x][y].seen;
        });
    }
    updatePatrol(walker) {
        if (this.step === NEW_POINT_EVERY) {
            this.step = 0;
            if (this.patrol === undefined) {
                this.patrol = new patrol_1.Patrol(walker.x, walker.y);
            }
            else {
                this.patrol.addNode(walker.x, walker.y);
            }
        }
        this.step++;
    }
}
exports.Explorer = Explorer;

},{"../ai":1,"../logger":7,"./patrol":3}],3:[function(require,module,exports){
"use strict";
const utils_1 = require("../utils");
const ai_1 = require("../ai");
class Patrol {
    constructor(x, y) {
        this.i = "a";
        this.step = 0;
        this.graph = new graphlib.Graph();
        this.addNode(x, y, false);
        this.lastNodeVisit = {};
        this.markNodeVisited(this.currentNodeID);
        this.path = [];
    }
    act(walker) {
        if (this.path.length) {
            this.moveToTarget(walker);
        }
        else {
            if (this.targetNodeID) {
                this.markNodeVisited(this.targetNodeID);
                this.currentNodeID = this.targetNodeID;
            }
            this.pickUpNewTarget(walker);
            this.moveToTarget(walker);
        }
        this.step += 1;
    }
    addNode(x, y, withEdge = true) {
        this.graph.setNode(this.i, { x: x, y: y });
        if (withEdge) {
            this.graph.setEdge(this.currentNodeID, this.i);
        }
        this.currentNodeID = this.i;
        this.i = utils_1.succ(this.i);
    }
    buildNewPath(walker) {
        const pos = this.graph.node(this.targetNodeID);
        this.path = ai_1.leePath(walker, (x, y) => {
            return (pos.x === x) && (pos.y === y);
        });
    }
    pickUpNewTarget(walker) {
        let seenLastID = this.currentNodeID;
        let seenLastStep = this.lastNodeVisit[seenLastID];
        this.graph.neighbors(this.currentNodeID).forEach((nodeID) => {
            if (seenLastStep > (this.lastNodeVisit[nodeID] || 0))
                seenLastID = nodeID;
            seenLastStep = this.lastNodeVisit[seenLastID];
        });
        this.targetNodeID = seenLastID;
        this.buildNewPath(walker);
    }
    moveToTarget(walker) {
        const nextPoint = this.path.shift();
        if (walker.stageMemory[nextPoint.x][nextPoint.y].tangible) {
            this.path = [];
            this.act(walker);
        }
        else {
            walker.x = nextPoint.x;
            walker.y = nextPoint.y;
        }
    }
    markNodeVisited(nodeID) {
        this.lastNodeVisit[nodeID] = this.step;
    }
}
exports.Patrol = Patrol;

},{"../ai":1,"../utils":8}],4:[function(require,module,exports){
"use strict";
const utils_1 = require("../utils");
const game_1 = require("../game");
const ai_1 = require("../ai");
const explorer_ts_1 = require("../ai/explorer.ts");
class Walker {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.tile = new game_1.Type(game_1.TileType.humanoid);
        this.stageMemory = utils_1.twoDimArray(utils_1.MAX_X, utils_1.MAX_Y, () => { return new ai_1.TileRecall(); });
        this.radius = 10;
        this.ai = new explorer_ts_1.Explorer();
    }
    act(stage) {
        this.stageMemory[this.x][this.y].updated = true;
        this.visionMask(stage);
        this.ai.act(this);
        this.stageMemory[this.x][this.y].updated = true;
    }
    visionMask(stage) {
        this.stageMemory.forEach((row) => {
            row.forEach((tile) => {
                tile.updated = tile.visible;
                tile.visible = false;
            });
        });
        const see = (x, y, tangible) => {
            this.stageMemory[x][y].visible = true;
            this.stageMemory[x][y].seen = true;
            this.stageMemory[x][y].tangible = tangible;
        };
        const los = (x0, y0, x1, y1) => {
            const dx = x1 - x0;
            const dy = y1 - y0;
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let xnext = x0;
            let ynext = y0;
            const denom = Math.sqrt(dx * dx + dy * dy);
            const dist = 0.5 * denom;
            while (xnext !== x1 || ynext !== y1) {
                if (stage.field[xnext][ynext].tangible()) {
                    see(xnext, ynext, true);
                    return;
                }
                if (Math.abs(dy * (xnext - x0 + sx) - dx * (ynext - y0)) < dist) {
                    xnext += sx;
                }
                else if (Math.abs(dy * (xnext - x0) - dx * (ynext - y0 + sy)) < dist) {
                    ynext += sy;
                }
                else {
                    xnext += sx;
                    ynext += sy;
                }
            }
            see(x1, y1, stage.field[x1][y1].tangible());
        };
        for (let i = -this.radius; i <= this.radius; i++)
            for (let j = -this.radius; j <= this.radius; j++)
                if (i * i + j * j < this.radius * this.radius)
                    los(this.x, this.y, this.x + i, this.y + j);
    }
}
exports.Walker = Walker;

},{"../ai":1,"../ai/explorer.ts":2,"../game":5,"../utils":8}],5:[function(require,module,exports){
"use strict";
const utils_1 = require("./utils");
class DisplayTile {
    constructor(char, foreground, background, opts = {}) {
        this.char = char;
        this.foreground = foreground;
        this.background = background;
        this.visible = (opts.visible === undefined) ? true : opts.visible;
        this.tangible = (opts.tangible === undefined) ? true : opts.tangible;
    }
}
var Effect;
(function (Effect) {
    Effect[Effect["Shaded"] = 0] = "Shaded";
})(Effect || (Effect = {}));
class Renderer {
    constructor(display) {
        this.display = display;
    }
    renderStage(stage, walker) {
        walker.stageMemory.forEach((row, x) => {
            row.forEach((tile, y) => {
                if (tile.updated) {
                    if (tile.visible) {
                        this.renderTile(x, y, stage.at(x, y).printTile());
                    }
                    else if (tile.seen) {
                        this.renderTile(x, y, stage.at(x, y).printTile(), [Effect.Shaded]);
                    }
                }
            });
        });
    }
    renderTile(x, y, tile, effects = []) {
        const colors = this.buildColor(tile.foreground, tile.background, effects);
        this.display.drawText(x, y, `${colors}${tile.char}`);
    }
    buildColor(foreground, background, effects) {
        let fColor = foreground, bColor = background;
        if (effects.indexOf(Effect.Shaded) >= 0) {
            const f = (fColor[0] + fColor[1] + fColor[2]) / 3;
            fColor = [f, f, f];
            const b = (bColor[0] + bColor[1] + bColor[2]) / 3;
            bColor = [b, b, b];
        }
        return `%c{${ROT.Color.toRGB(fColor)}}%b{${ROT.Color.toRGB(bColor)}}`;
    }
}
exports.Renderer = Renderer;
const white = [255, 255, 255];
const black = [0, 0, 0];
const red = [255, 0, 0];
const green = [0, 255, 0];
const blue = [0, 0, 255];
const yellow = [150, 150, 0];
(function (TileType) {
    TileType[TileType["wall"] = 0] = "wall";
    TileType[TileType["space"] = 1] = "space";
    TileType[TileType["unknown"] = 2] = "unknown";
    TileType[TileType["humanoid"] = 3] = "humanoid";
})(exports.TileType || (exports.TileType = {}));
var TileType = exports.TileType;
class Type {
    constructor(type) {
        this.type = type;
    }
    static get tileTypes() {
        return {
            [TileType.wall]: new DisplayTile("#", yellow, yellow, { tangible: true, visible: true }),
            [TileType.space]: new DisplayTile(".", yellow, black, { tangible: false, visible: true }),
            [TileType.unknown]: new DisplayTile(" ", black, white, { tangible: true, visible: false }),
            [TileType.humanoid]: new DisplayTile("@", green, black, { tangible: true, visible: true })
        };
    }
    tangible() {
        return this.printTile().tangible;
    }
    printTile() {
        return Type.tileTypes[this.type];
    }
}
exports.Type = Type;
const newWall = function () {
    return new Type(TileType.wall);
};
class Stage {
    constructor(dimX, dimY, baseBlock = newWall) {
        this.dimX = dimX;
        this.dimY = dimY;
        this.field = utils_1.twoDimArray(dimX, dimY, baseBlock);
    }
    at(x, y) {
        return this.field[x][y];
    }
}
exports.Stage = Stage;

},{"./utils":8}],6:[function(require,module,exports){
"use strict";
const utils_1 = require("../utils");
const game_1 = require("../game");
const THICKNESS = 0;
const MIN_SIZE = 4;
const MAX_SIZE = 10;
const ROOMS_COUNT = 5;
const newSpace = function () {
    return new game_1.Type(game_1.TileType.space);
};
const generate = function (dimX, dimY) {
    const dungeon = new DungeonGenerator(dimX, dimY);
    let stage = new game_1.Stage(dimX, dimY);
    for (let i = 0; i < dungeon.rooms.length; i++)
        dungeon.rooms[i].add(stage);
    for (let i = 0; i < dungeon.roads.length; i++)
        dungeon.roads[i].add(stage);
    return stage;
};
exports.generate = generate;
class Room extends utils_1.Rect {
    notCross(rect) {
        return (rect.x - THICKNESS > this.x + this.w) ||
            (rect.y - THICKNESS > this.y + this.h) ||
            (rect.x + rect.w < this.x - THICKNESS) ||
            (rect.y + rect.h < this.y - THICKNESS);
    }
    pointWithin() {
        return {
            x: this.x + 1 + utils_1.rand(this.w - 1),
            y: this.y + 1 + utils_1.rand(this.h - 1)
        };
    }
    add(stage) {
        let i = 0;
        while (i < this.w) {
            let j = 0;
            while (j < this.h) {
                stage.field[this.x + i][this.y + j] = newSpace();
                j++;
            }
            i++;
        }
    }
}
class Road extends utils_1.Rect {
    constructor(x, y, w, h) {
        super(x, y, w, h);
        this.lined = ((x >= w) && (y >= h)) || (w >= x) && (h >= y);
    }
    add(stage) {
        let [hx, hy, w] = this.horizontalLine();
        let i = 0;
        while (i < w) {
            stage.field[hx + i][hy] = newSpace();
            i += 1;
        }
        let [vx, vy, h] = this.verticallLine();
        let j = 0;
        while (j < h) {
            stage.field[vx][vy + j] = newSpace();
            j += 1;
        }
    }
    horizontalLine() {
        if (this.lined)
            return [Math.min(this.x, this.w), Math.max(this.y, this.h), Math.abs(this.w - this.x)];
        else
            return [Math.min(this.x, this.w), Math.min(this.y, this.h), Math.abs(this.w - this.x)];
    }
    verticallLine() {
        if (this.lined)
            return [Math.min(this.x, this.w), Math.min(this.y, this.h), Math.abs(this.h - this.y)];
        else
            return [Math.min(this.x, this.w), Math.min(this.y, this.h), Math.abs(this.h - this.y)];
    }
}
class DungeonGenerator {
    constructor(maxX, maxY) {
        this.maxX = maxX;
        this.maxY = maxY;
        let rooms = [];
        let i = 0;
        while (i < ROOMS_COUNT) {
            rooms.push(this.generateRoom());
            i += 1;
        }
        this.rooms = this.normalize(this.fuzzifyRooms(rooms));
        this.roads = this.buildRoads(this.rooms);
    }
    generateRoom() {
        return new Room(0, 0, MIN_SIZE + utils_1.rand(MAX_SIZE - MIN_SIZE), MIN_SIZE + utils_1.rand(MAX_SIZE - MIN_SIZE));
    }
    fuzzifyRooms(rooms) {
        let pickedRooms = [rooms.shift()];
        while (rooms.length) {
            let currentRoom = rooms.shift();
            let angle = utils_1.rand(360) / 180 * Math.PI;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            let l = 0;
            let dx = 0;
            let dy = 0;
            while (!pickedRooms.every((room) => currentRoom.notCross(room))) {
                let ndx = Math.round(l * cos);
                let ndy = Math.round(l * sin);
                while (true) {
                    l += 1;
                    ndx = Math.round(l * cos);
                    ndy = Math.round(l * sin);
                    if (ndx !== dx || ndy !== dy) {
                        break;
                    }
                }
                currentRoom.move(ndx - dx, ndy - dy);
                dx = ndx;
                dy = ndy;
            }
            pickedRooms.push(currentRoom);
        }
        return pickedRooms;
    }
    normalize(rooms) {
        const minX = utils_1.min(rooms.map((room) => room.x)) - 1;
        const minY = utils_1.min(rooms.map((room) => room.y)) - 1;
        rooms.forEach((room) => { room.move(-minX, -minY); });
        return rooms.filter((room) => {
            return (room.x + room.w < this.maxX) && (room.y + room.h < this.maxY);
        });
    }
    buildRoads(rooms) {
        let points = rooms.map((room) => { return room.pointWithin(); });
        let connectedPoints = [points.shift()];
        let roads = [];
        const distance = function (point1, point2) {
            return Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2);
        };
        while (points.length) {
            let currentPoint = points.shift();
            let pointToConnect = connectedPoints[0];
            let minDistance = distance(currentPoint, pointToConnect);
            connectedPoints.forEach((point) => {
                const currentDistance = distance(point, currentPoint);
                if (currentDistance < minDistance) {
                    pointToConnect = point;
                    minDistance = currentDistance;
                }
            });
            connectedPoints.push(currentPoint);
            roads.push(new Road(currentPoint.x, currentPoint.y, pointToConnect.x, pointToConnect.y));
        }
        return roads;
    }
}

},{"../game":5,"../utils":8}],7:[function(require,module,exports){
"use strict";
let block = undefined;
class Logger {
    static info(message) {
        this.withClass("info", message);
    }
    static warning(message) {
        this.withClass("warning", message);
    }
    static danger(message) {
        this.withClass("danger", message);
    }
    static withClass(classes, message) {
        this.get().append(`<tr>
        <td>${moment().format("hh:mm:ss")}</td>
        <td class='${classes}'>${message}</td>
        </tr>`);
    }
    static get() {
        return block ? block : (block = $("#game-logs"));
    }
}
exports.Logger = Logger;

},{}],8:[function(require,module,exports){
"use strict";
class Rect {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    move(x, y) {
        this.x += x;
        this.y += y;
    }
}
exports.Rect = Rect;
exports.MAX_X = 100;
exports.MAX_Y = 100;
exports.succ = function (c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
};
exports.rand = function (max) {
    return Math.floor(Math.random() * max);
};
exports.twoDimArray = function (dimX, dimY, value) {
    let field = Array(dimX);
    let i = 0;
    while (i < dimX) {
        field[i] = new Array(dimY);
        let j = 0;
        while (j < dimY) {
            field[i][j] = value(i, j);
            j++;
        }
        i++;
    }
    return field;
};
exports.max = function (list) {
    return Math.max.apply(Math, list);
};
exports.min = function (list) {
    return Math.min.apply(Math, list);
};

},{}],9:[function(require,module,exports){
"use strict";
const utils_1 = require("./javascript/utils");
const game_1 = require("./javascript/game");
const walker_1 = require("./javascript/creature/walker");
const DungeonGenerator = require("./javascript/generators/dungeon");
$(function () {
    if (!ROT.isSupported()) {
        alert("The rot.js library isn't supported by your browser.");
    }
    else {
        const display = new ROT.Display({ height: utils_1.MAX_Y, width: utils_1.MAX_X });
        $("#game-screen").append(display.getContainer());
        let stage = DungeonGenerator.generate(utils_1.MAX_X, utils_1.MAX_Y);
        const render = new game_1.Renderer(display);
        const freeSpot = function (stage) {
            for (let i = 0; i < stage.field.length; i++) {
                for (let j = 0; j < stage.field[i].length; j++) {
                    if (!stage.field[i][j].tangible()) {
                        return [i, j];
                    }
                }
            }
        };
        const freeSpot2 = function (stage) {
            for (let i = stage.field.length - 1; i >= 0; i--) {
                for (let j = stage.field[i].length - 1; j >= 0; j--) {
                    if (!stage.field[i][j].tangible()) {
                        return [i, j];
                    }
                }
            }
        };
        let [x, y] = freeSpot(stage), [x2, y2] = freeSpot2(stage);
        let walker = new walker_1.Walker(x, y);
        let walker2 = new walker_1.Walker(x2, y2);
        setInterval(() => {
            render.renderStage(stage, walker);
            render.renderStage(stage, walker2);
            render.renderTile(walker.x, walker.y, walker.tile.printTile());
            render.renderTile(walker2.x, walker2.y, walker2.tile.printTile());
            walker.act(stage);
            walker2.act(stage);
        }, 100);
    }
});

},{"./javascript/creature/walker":4,"./javascript/game":5,"./javascript/generators/dungeon":6,"./javascript/utils":8}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvamF2YXNjcmlwdC9haS50cyIsInNyYy9qYXZhc2NyaXB0L2FpL2V4cGxvcmVyLnRzIiwic3JjL2phdmFzY3JpcHQvYWkvcGF0cm9sLnRzIiwic3JjL2phdmFzY3JpcHQvY3JlYXR1cmUvd2Fsa2VyLnRzIiwic3JjL2phdmFzY3JpcHQvZ2FtZS50cyIsInNyYy9qYXZhc2NyaXB0L2dlbmVyYXRvcnMvZHVuZ2Vvbi50cyIsInNyYy9qYXZhc2NyaXB0L2xvZ2dlci50cyIsInNyYy9qYXZhc2NyaXB0L3V0aWxzLnRzIiwic3JjL21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUEsd0JBQWlELFNBQ2pELENBQUMsQ0FEeUQ7QUFDMUQseUJBQXVCLG1CQUV2QixDQUFDLENBRnlDO0FBNkZqQixjQUFNO0FBdkYvQjtJQU1FO1FBQ0UsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUE7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7SUFDdEIsQ0FBQztBQUNILENBQUM7QUEyRVksa0JBQVUsY0EzRXRCO0FBRUQsTUFBTSxPQUFPLEdBQUcsVUFBVyxNQUFjLEVBQ2QsV0FBZ0Q7SUFFekUsSUFBSSxXQUFXLEdBQTZCLG1CQUFXLENBQUUsYUFBSyxFQUFFLGFBQUssRUFBRSxRQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUEsQ0FBQyxDQUFDLENBQUUsQ0FBQTtJQUNuRyxJQUFJLGFBQWEsR0FBbUIsRUFBRSxDQUFBO0lBQ3RDLElBQUksYUFBYSxHQUFtQixDQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBRSxDQUFBO0lBRXBFLElBQUksSUFB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LENBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUUsQ0FBQTtRQUloRyxJQUFJO1lBQ0YsTUFBTSxDQUFDLENBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUUsQ0FBQTtJQUNsRyxDQUFDO0lBRUQsYUFBYTtRQUlYLEVBQUUsQ0FBQyxDQUFFLElBQUksQ0FBQyxLQUFNLENBQUM7WUFDZixNQUFNLENBQUMsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUUsQ0FBRSxDQUFBO1FBSWhHLElBQUk7WUFDRixNQUFNLENBQUMsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUUsQ0FBRSxDQUFBO0lBQ2xHLENBQUM7QUFDSCxDQUFDO0FBRUQ7SUFJRSxZQUF1QixJQUFZLEVBQVksSUFBWTtRQUFwQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVksU0FBSSxHQUFKLElBQUksQ0FBUTtRQUN6RCxJQUFJLEtBQUssR0FBa0IsRUFBRSxDQUFBO1FBRTdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULE9BQVEsQ0FBQyxHQUFHLFdBQVcsRUFBRyxDQUFDO1lBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFFLENBQUE7WUFDakMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUUsSUFBSSxDQUFDLFlBQVksQ0FBRSxLQUFLLENBQUUsQ0FBRSxDQUFBO1FBQ3pELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUMsS0FBSyxDQUFFLENBQUE7SUFDNUMsQ0FBQztJQUVPLFlBQVk7UUFDbEIsTUFBTSxDQUFDLElBQUksSUFBSSxDQUNiLENBQUMsRUFDRCxDQUFDLEVBQ0QsUUFBUSxHQUFHLFlBQUksQ0FBRSxRQUFRLEdBQUcsUUFBUSxDQUFFLEVBQ3RDLFFBQVEsR0FBRyxZQUFJLENBQUUsUUFBUSxHQUFHLFFBQVEsQ0FBRSxDQUN2QyxDQUFBO0lBQ0gsQ0FBQztJQUVPLFlBQVksQ0FBRSxLQUFvQjtRQUN4QyxJQUFJLFdBQVcsR0FBa0IsQ0FBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUUsQ0FBQTtRQUVsRCxPQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUcsQ0FBQztZQUN0QixJQUFJLFdBQVcsR0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7WUFFckMsSUFBSSxLQUFLLEdBQVcsWUFBSSxDQUFFLEdBQUcsQ0FBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO1lBRy9DLE1BQU0sR0FBRyxHQUFXLElBQUksQ0FBQyxHQUFHLENBQUUsS0FBSyxDQUFFLENBQUE7WUFDckMsTUFBTSxHQUFHLEdBQVcsSUFBSSxDQUFDLEdBQUcsQ0FBRSxLQUFLLENBQUUsQ0FBQTtZQUNyQyxJQUFJLENBQUMsR0FBVyxDQUFDLENBQUE7WUFDakIsSUFBSSxFQUFFLEdBQVcsQ0FBQyxDQUFBO1lBQ2xCLElBQUksRUFBRSxHQUFXLENBQUMsQ0FBQTtZQUVsQixPQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBRSxDQUFFLElBQUksS0FBTSxXQUFXLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxDQUFFLEVBQUUsQ0FBQztnQkFDdkUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxDQUFDLEdBQUcsR0FBRyxDQUFFLENBQUE7Z0JBQy9CLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBRSxDQUFBO2dCQUUvQixPQUFRLElBQUksRUFBRyxDQUFDO29CQUNkLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ04sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBRSxDQUFBO29CQUMzQixHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxDQUFDLEdBQUcsR0FBRyxDQUFFLENBQUE7b0JBRTNCLEVBQUUsQ0FBQyxDQUFFLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQy9CLEtBQUssQ0FBQTtvQkFDUCxDQUFDO2dCQUNILENBQUM7Z0JBRUQsV0FBVyxDQUFDLElBQUksQ0FBRSxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUUsQ0FBQTtnQkFDdEMsRUFBRSxHQUFHLEdBQUcsQ0FBQTtnQkFDUixFQUFFLEdBQUcsR0FBRyxDQUFBO1lBQ1YsQ0FBQztZQUVELFdBQVcsQ0FBQyxJQUFJLENBQUUsV0FBVyxDQUFFLENBQUE7UUFDakMsQ0FBQztRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUE7SUFDcEIsQ0FBQztJQUVPLFNBQVMsQ0FBRSxLQUFvQjtRQUNyQyxNQUFNLElBQUksR0FBRyxXQUFHLENBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBRSxDQUFFLElBQUksS0FBTSxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkQsTUFBTSxJQUFJLEdBQUcsV0FBRyxDQUFFLEtBQUssQ0FBQyxHQUFHLENBQUUsQ0FBRSxJQUFJLEtBQU0sSUFBSSxDQUFDLENBQUMsQ0FBRSxDQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZELEtBQUssQ0FBQyxPQUFPLENBQUUsQ0FBRSxJQUFJLE9BQVEsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFFLElBQUksRUFBRSxDQUFFLElBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFFLENBQUE7UUFFNUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUUsQ0FBRSxJQUFVO1lBQy9CLE1BQU0sQ0FBQyxDQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFFLElBQUksQ0FBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQzNFLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVPLFVBQVUsQ0FBRSxLQUFvQjtRQUN0QyxJQUFJLE1BQU0sR0FBbUIsS0FBSyxDQUFDLEdBQUcsQ0FBRSxDQUFFLElBQUksT0FBUSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFFLENBQUE7UUFFbkYsSUFBSSxlQUFlLEdBQW1CLENBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFFLENBQUE7UUFDeEQsSUFBSSxLQUFLLEdBQWtCLEVBQUUsQ0FBQTtRQUU3QixNQUFNLFFBQVEsR0FBRyxVQUFVLE1BQWEsRUFBRSxNQUFhO1lBRXJELE1BQU0sQ0FBQyxTQUFBLENBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFFLEVBQUksQ0FBQyxDQUFBLEdBQUcsU0FBQSxDQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBRSxFQUFJLENBQUMsQ0FBQSxDQUFBO1FBQ3BFLENBQUMsQ0FBQTtRQUVELE9BQVEsTUFBTSxDQUFDLE1BQU0sRUFBRyxDQUFDO1lBQ3ZCLElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUVqQyxJQUFJLGNBQWMsR0FBRyxlQUFlLENBQUUsQ0FBQyxDQUFFLENBQUE7WUFDekMsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFFLFlBQVksRUFBRSxjQUFjLENBQUUsQ0FBQTtZQUUxRCxlQUFlLENBQUMsT0FBTyxDQUFFLENBQUUsS0FBSztnQkFDOUIsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFFLEtBQUssRUFBRSxZQUFZLENBQUUsQ0FBQTtnQkFDdkQsRUFBRSxDQUFDLENBQUUsZUFBZSxHQUFHLFdBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLGNBQWMsR0FBRyxLQUFLLENBQUE7b0JBQ3RCLFdBQVcsR0FBRyxlQUFlLENBQUE7Z0JBQy9CLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQTtZQUVGLGVBQWUsQ0FBQyxJQUFJLENBQUUsWUFBWSxDQUFFLENBQUE7WUFFcEMsS0FBSyxDQUFDLElBQUksQ0FBRSxJQUFJLElBQUksQ0FDbEIsWUFBWSxDQUFDLENBQUMsRUFDZCxZQUFZLENBQUMsQ0FBQyxFQUNkLGNBQWMsQ0FBQyxDQUFDLEVBQ2hCLGNBQWMsQ0FBQyxDQUFDLENBQ2pCLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFBO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFa0I7OztBQy9ObkIsSUFBSSxLQUFLLEdBQVcsU0FBUyxDQUFBO0FBRTdCO0lBQ0UsT0FBYyxJQUFJLENBQUUsT0FBZTtRQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFFLE1BQU0sRUFBRSxPQUFPLENBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsT0FBYyxPQUFPLENBQUUsT0FBZTtRQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFFLFNBQVMsRUFBRSxPQUFPLENBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsT0FBYyxNQUFNLENBQUUsT0FBZTtRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFFLFFBQVEsRUFBRSxPQUFPLENBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsT0FBZSxTQUFTLENBQUUsT0FBZSxFQUFFLE9BQWU7UUFFeEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FDZjtjQUNTLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBRSxVQUFVLENBQUc7cUJBQ3ZCLE9BQVEsS0FBTSxPQUFRO2NBQzlCLENBQ1QsQ0FBQTtJQUVILENBQUM7SUFFRCxPQUFlLEdBQUc7UUFDaEIsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFFLFlBQVksQ0FBRSxDQUFFLENBQUE7SUFDdEQsQ0FBQztBQUNILENBQUM7QUEzQlksY0FBTSxTQTJCbEIsQ0FBQTs7OztBQzdCRDtJQU1FLFlBQWEsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztRQUVyRCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNWLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJLENBQUUsQ0FBUyxFQUFFLENBQVM7UUFDeEIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDWCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNiLENBQUM7QUFDSCxDQUFDO0FBbEJZLFlBQUksT0FrQmhCLENBQUE7QUFFWSxhQUFLLEdBQVcsR0FBRyxDQUFBO0FBQ25CLGFBQUssR0FBVyxHQUFHLENBQUE7QUFFbkIsWUFBSSxHQUFHLFVBQVcsQ0FBUztJQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBRSxDQUFDLENBQUMsVUFBVSxDQUFFLENBQUMsQ0FBRSxHQUFHLENBQUMsQ0FBRSxDQUFBO0FBQ3JELENBQUMsQ0FBQTtBQUVZLFlBQUksR0FBRyxVQUFXLEdBQVc7SUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQTtBQUdZLG1CQUFXLEdBQUcsVUFBVyxJQUFZLEVBQUUsSUFBWSxFQUMxQixLQUFzQztJQUMxRSxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUUsSUFBSSxDQUFFLENBQUE7SUFFekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsT0FBUSxDQUFDLEdBQUcsSUFBSSxFQUFHLENBQUM7UUFDbEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULE9BQVEsQ0FBQyxHQUFHLElBQUksRUFBRyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFBO1lBQzNCLENBQUMsRUFBRSxDQUFBO1FBQ0wsQ0FBQztRQUNELENBQUMsRUFBRSxDQUFBO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUE7QUFDZCxDQUFDLENBQUE7QUFFWSxXQUFHLEdBQUcsVUFBVSxJQUFxQjtJQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsSUFBSSxFQUFFLElBQUksQ0FBRSxDQUFBO0FBQ3JDLENBQUMsQ0FBQTtBQUVZLFdBQUcsR0FBRyxVQUFVLElBQXFCO0lBQ2hELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxJQUFJLEVBQUUsSUFBSSxDQUFFLENBQUE7QUFDckMsQ0FBQyxDQUFBOzs7O0FDeERELHdCQUFtQyxvQkFDbkMsQ0FBQyxDQURzRDtBQUN2RCx1QkFBZ0MsbUJBQ2hDLENBQUMsQ0FEa0Q7QUFDbkQseUJBQXVCLDhCQUV2QixDQUFDLENBRm9EO0FBR3JELE1BQVksZ0JBQWdCLFdBQU0saUNBQ2xDLENBQUMsQ0FEa0U7QUFHbkUsQ0FBQyxDQUFFO0lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUVOLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxhQUFLLEVBQUUsS0FBSyxFQUFFLGFBQUssRUFBRSxDQUFDLENBQUE7UUFHaEUsQ0FBQyxDQUFFLGNBQWMsQ0FBRSxDQUFDLE1BQU0sQ0FBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUUsQ0FBQTtRQUVwRCxJQUFJLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUUsYUFBSyxFQUFFLGFBQUssQ0FBRSxDQUFBO1FBR3JELE1BQU0sTUFBTSxHQUFHLElBQUksZUFBUSxDQUFFLE9BQU8sQ0FBRSxDQUFBO1FBbUJ0QyxNQUFNLFFBQVEsR0FBRyxVQUFVLEtBQVk7WUFDckMsR0FBRyxDQUFDLENBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRyxDQUFDO2dCQUM5QyxHQUFHLENBQUMsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFHLENBQUM7b0JBQ25ELEVBQUUsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBRSxDQUFDLENBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBQyxRQUFRLEVBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3hDLE1BQU0sQ0FBQyxDQUFFLENBQUMsRUFBRSxDQUFDLENBQUUsQ0FBQTtvQkFDakIsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUMsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLFVBQVUsS0FBWTtZQUN0QyxHQUFHLENBQUMsQ0FBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRyxDQUFDO2dCQUNuRCxHQUFHLENBQUMsQ0FBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRyxDQUFDO29CQUN4RCxFQUFFLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUMsUUFBUSxFQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUN4QyxNQUFNLENBQUMsQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLENBQUE7b0JBQ2pCLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxHQUFHLFFBQVEsQ0FBRSxLQUFLLENBQUUsRUFDNUIsQ0FBRSxFQUFFLEVBQUUsRUFBRSxDQUFFLEdBQUcsU0FBUyxDQUFFLEtBQUssQ0FBRSxDQUFBO1FBRW5DLElBQUksTUFBTSxHQUFHLElBQUksZUFBTSxDQUFFLENBQUMsRUFBRSxDQUFDLENBQUUsQ0FBQTtRQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGVBQU0sQ0FBRSxFQUFFLEVBQUUsRUFBRSxDQUFFLENBQUE7UUFFbEMsV0FBVyxDQUFFO1lBRVgsTUFBTSxDQUFDLFdBQVcsQ0FBRSxLQUFLLEVBQUUsTUFBTSxDQUFFLENBQUE7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBRSxLQUFLLEVBQUUsT0FBTyxDQUFFLENBQUE7WUFFcEMsTUFBTSxDQUFDLFVBQVUsQ0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBRSxDQUFBO1lBQ2pFLE1BQU0sQ0FBQyxVQUFVLENBQUcsT0FBTyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUUsQ0FBQTtZQUNwRSxNQUFNLENBQUMsR0FBRyxDQUFFLEtBQUssQ0FBRSxDQUFBO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUUsS0FBSyxDQUFFLENBQUE7UUFFdEIsQ0FBQyxFQUFFLEdBQUcsQ0FBRSxDQUFBO0lBQ1YsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7IE1BWF9YLCBNQVhfWSwgUG9pbnQsIHR3b0RpbUFycmF5IH0gZnJvbSBcIi4vdXRpbHNcIlxuaW1wb3J0IHsgV2Fsa2VyIH0gZnJvbSBcIi4vY3JlYXR1cmUvd2Fsa2VyXCJcblxuaW50ZXJmYWNlIEFJIHtcbiAgYWN0KCB3YWxrZXI6IFdhbGtlciApOiB2b2lkXG59XG5cbmNsYXNzIFRpbGVSZWNhbGwge1xuICBzZWVuOiBib29sZWFuXG4gIHRhbmdpYmxlOiBib29sZWFuXG4gIHZpc2libGU6IGJvb2xlYW5cbiAgdXBkYXRlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2VlbiA9IGZhbHNlXG4gICAgdGhpcy50YW5naWJsZSA9IGZhbHNlXG4gICAgdGhpcy52aXNpYmxlID0gZmFsc2VcbiAgICB0aGlzLnVwZGF0ZWQgPSBmYWxzZVxuICB9XG59XG5cbmNvbnN0IGxlZVBhdGggPSBmdW5jdGlvbiAoIHdhbGtlcjogV2Fsa2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb246ICggeDogbnVtYmVyLCB5OiBudW1iZXIgKSA9PiBib29sZWFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgKTogQXJyYXk8IFBvaW50ID4ge1xuICBsZXQgc3RhZ2VNZW1vcnk6IEFycmF5PCBBcnJheTwgbnVtYmVyID4gPiA9IHR3b0RpbUFycmF5KCBNQVhfWCwgTUFYX1ksICgpID0+IHsgcmV0dXJuIHVuZGVmaW5lZCB9IClcbiAgbGV0IHBvaW50c1RvVmlzaXQ6IEFycmF5PCBQb2ludCA+ID0gW11cbiAgbGV0IHBvaW50c1RvQ2hlY2s6IEFycmF5PCBQb2ludCA+ID0gWyB7IHg6IHdhbGtlci54LCB5OiB3YWxrZXIueSB9IF1cblxuICBsZXQgc3RlcCA9IDBcbiAgd2hpbGUgKCBwb2ludHNUb0NoZWNrLmxlbmd0aCAmJiAhcG9pbnRzVG9WaXNpdC5sZW5ndGggKSB7XG4gICAgLy8gY29uc29sZS5sb2cocG9pbnRzVG9DaGVjayApXG4gICAgbGV0IHdhdmVQb2ludHM6IEFycmF5PCBQb2ludCA+ID0gW11cblxuICAgIHBvaW50c1RvQ2hlY2suZm9yRWFjaCggKCBwb2ludDogUG9pbnQgKSA9PiB7XG4gICAgICAvLyBUT0RPOiBDb21wYXJlLCBjdXJyZW50IHZhbHVlIG1pZ2h0IGJlIGxvd2VyXG4gICAgICBpZiAoIHdhbGtlci5zdGFnZU1lbW9yeVsgcG9pbnQueCBdWyBwb2ludC55IF0udGFuZ2libGUgfHxcbiAgICAgICAgICBzdGFnZU1lbW9yeVsgcG9pbnQueCBdWyBwb2ludC55IF0gIT09IHVuZGVmaW5lZCApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHN0YWdlTWVtb3J5WyBwb2ludC54IF1bIHBvaW50LnkgXSA9IHN0ZXBcbiAgICAgIGlmICggZGVzdGluYXRpb24oIHBvaW50LngsIHBvaW50LnkgKSApIHtcbiAgICAgICAgcG9pbnRzVG9WaXNpdC5wdXNoKCBwb2ludCApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3YXZlUG9pbnRzLnB1c2goIHsgeDogcG9pbnQueCAtIDEsIHk6IHBvaW50LnkgfSlcbiAgICAgICAgd2F2ZVBvaW50cy5wdXNoKCB7IHg6IHBvaW50LnggKyAxLCB5OiBwb2ludC55IH0pXG4gICAgICAgIHdhdmVQb2ludHMucHVzaCggeyB4OiBwb2ludC54LCB5OiBwb2ludC55IC0gMSB9KVxuICAgICAgICB3YXZlUG9pbnRzLnB1c2goIHsgeDogcG9pbnQueCwgeTogcG9pbnQueSArIDEgfSlcbiAgICAgICAgd2F2ZVBvaW50cy5wdXNoKCB7IHg6IHBvaW50LnggLSAxLCB5OiBwb2ludC55IC0gMSB9KVxuICAgICAgICB3YXZlUG9pbnRzLnB1c2goIHsgeDogcG9pbnQueCArIDEsIHk6IHBvaW50LnkgLSAxIH0pXG4gICAgICAgIHdhdmVQb2ludHMucHVzaCggeyB4OiBwb2ludC54ICsgMSwgeTogcG9pbnQueSArIDEgfSlcbiAgICAgICAgd2F2ZVBvaW50cy5wdXNoKCB7IHg6IHBvaW50LnggLSAxLCB5OiBwb2ludC55ICsgMSB9KVxuICAgICAgfVxuICAgIH0pXG4gICAgc3RlcCsrXG5cbiAgICBwb2ludHNUb0NoZWNrID0gd2F2ZVBvaW50c1xuICB9XG5cbiAgaWYgKCBwb2ludHNUb1Zpc2l0Lmxlbmd0aCApIHtcbiAgICBwb2ludHNUb1Zpc2l0WyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogcG9pbnRzVG9WaXNpdC5sZW5ndGggKSBdXG4gICAgcmV0dXJuIGJ1aWxkUm9hZCggcG9pbnRzVG9WaXNpdFsgMCBdLCBzdGFnZU1lbW9yeSApXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuXG5jb25zdCBidWlsZFJvYWQgPSBmdW5jdGlvbiAoIHBvaW50OiBQb2ludCwgc3RhZ2VNZW1vcnk6IEFycmF5PCBBcnJheTwgbnVtYmVyID4gPiApOiBBcnJheTwgUG9pbnQgPiB7XG4gIGxldCB4MCA9IHBvaW50LngsIHkwID0gcG9pbnQueVxuICBsZXQgY2hhaW4gPSBbIHsgeDogeDAsIHk6IHkwIH0gXVxuXG4gIGxldCBkZWx0YTogUG9pbnQgPSB1bmRlZmluZWRcblxuICB3aGlsZSAoIHN0YWdlTWVtb3J5WyB4MCBdWyB5MCBdICE9PSAwICkge1xuXG4gICAgZGVsdGEgPSBbXG4gICAgICB7IHg6IC0xLCB5OiAwIH0sIHsgeDogMSwgeTogMCB9LCB7IHg6IDAsIHk6IC0xIH0sIHsgeDogMCwgeTogMSB9LFxuICAgICAgeyB4OiAtMSwgeTogLTEgfSwgeyB4OiAxLCB5OiAxIH0sIHsgeDogMSwgeTogLTEgfSwgeyB4OiAtMSwgeTogMSB9XG4gICAgXS5maW5kKCAoIGRwICk6IGJvb2xlYW4gPT4ge1xuXG4gICAgICByZXR1cm4gc3RhZ2VNZW1vcnlbIHgwICsgZHAueCBdICYmXG4gICAgICAgICggc3RhZ2VNZW1vcnlbIHgwICsgZHAueCBdWyB5MCArIGRwLnkgXSA9PT0gc3RhZ2VNZW1vcnlbIHgwIF1bIHkwIF0gLSAxIClcbiAgICB9KVxuXG4gICAgeDAgKz0gZGVsdGEueFxuICAgIHkwICs9IGRlbHRhLnlcblxuICAgIGNoYWluLnVuc2hpZnQoIHsgeDogeDAsIHk6IHkwIH0gKVxuICB9XG5cbiAgcmV0dXJuIGNoYWluXG59XG5cbmV4cG9ydCB7IEFJLCBUaWxlUmVjYWxsLCBXYWxrZXIsIGxlZVBhdGggfVxuIiwiaW1wb3J0IHsgTUFYX1gsIE1BWF9ZLCBQb2ludCwgdHdvRGltQXJyYXkgfSBmcm9tIFwiLi4vdXRpbHNcIlxuaW1wb3J0IHsgQUksIFRpbGVSZWNhbGwsIFdhbGtlciwgbGVlUGF0aCB9IGZyb20gXCIuLi9haVwiXG5pbXBvcnQgeyBQYXRyb2wgfSBmcm9tIFwiLi9wYXRyb2xcIlxuXG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiLi4vbG9nZ2VyXCJcblxuY29uc3QgTkVXX1BPSU5UX0VWRVJZOiBudW1iZXIgPSAxMFxuXG5jbGFzcyBFeHBsb3JlciBpbXBsZW1lbnRzIEFJIHtcbiAgcGF0aDogQXJyYXk8IFBvaW50ID5cbiAgcHJpdmF0ZSBzdGVwOiBudW1iZXJcblxuICBjb25zdHJ1Y3RvciggcHVibGljIHBhdHJvbDogUGF0cm9sID0gdW5kZWZpbmVkICkge1xuICAgIHRoaXMucGF0aCA9IFtdXG4gICAgdGhpcy5zdGVwID0gTkVXX1BPSU5UX0VWRVJZXG4gIH1cblxuICBhY3QoIHdhbGtlcjogV2Fsa2VyICk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlUGF0cm9sKCB3YWxrZXIgKVxuICAgIGlmICggIXRoaXMucGF0aC5sZW5ndGggKSB7XG4gICAgICB0aGlzLmJ1aWxkTmV3UGF0aCggd2Fsa2VyIClcbiAgICAgIGlmICggdGhpcy5wYXRoLmxlbmd0aCApIHtcbiAgICAgICAgdGhpcy5hY3QoIHdhbGtlciApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBMb2dnZXIuaW5mbyggXCJJJ20gZG9uZSwgdGltZSB0byBwYXRyb2xcIiApXG4gICAgICAgIHdhbGtlci5haSA9IHRoaXMucGF0cm9sXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG5leHRQb2ludDogUG9pbnQgPSB0aGlzLnBhdGguc2hpZnQoKVxuICAgICAgaWYgKCB3YWxrZXIuc3RhZ2VNZW1vcnlbIG5leHRQb2ludC54IF1bIG5leHRQb2ludC55IF0udGFuZ2libGUgKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IFtdXG4gICAgICAgIHRoaXMuYWN0KCB3YWxrZXIgKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2Fsa2VyLnggPSBuZXh0UG9pbnQueFxuICAgICAgICB3YWxrZXIueSA9IG5leHRQb2ludC55XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBidWlsZE5ld1BhdGgoIHdhbGtlcjogV2Fsa2VyICk6IHZvaWQge1xuICAgIHRoaXMucGF0aCA9IGxlZVBhdGgoIHdhbGtlciwgKCB4LCB5ICkgPT4ge1xuICAgICAgcmV0dXJuICF3YWxrZXIuc3RhZ2VNZW1vcnlbIHggXVsgeSBdLnNlZW5cbiAgICB9KVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVQYXRyb2woIHdhbGtlcjogV2Fsa2VyICk6IHZvaWQge1xuICAgIGlmICggdGhpcy5zdGVwID09PSBORVdfUE9JTlRfRVZFUlkgKSB7XG4gICAgICB0aGlzLnN0ZXAgPSAwXG4gICAgICBpZiAoIHRoaXMucGF0cm9sID09PSB1bmRlZmluZWQgKSB7XG4gICAgICAgIHRoaXMucGF0cm9sID0gbmV3IFBhdHJvbCggd2Fsa2VyLngsIHdhbGtlci55IClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF0cm9sLmFkZE5vZGUoIHdhbGtlci54LCB3YWxrZXIueSApXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zdGVwKytcbiAgfVxufVxuXG5leHBvcnQgeyBFeHBsb3JlciB9XG4iLCJpbXBvcnQgeyBQb2ludCwgcmFuZCwgc3VjYyB9IGZyb20gXCIuLi91dGlsc1wiXG5pbXBvcnQgeyBBSSwgVGlsZVJlY2FsbCwgV2Fsa2VyLCBsZWVQYXRoIH0gZnJvbSBcIi4uL2FpXCJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCIuLi9sb2dnZXJcIlxuXG50eXBlIE5vZGVJRCA9IHN0cmluZ1xuXG5jbGFzcyBQYXRyb2wgaW1wbGVtZW50cyBBSSB7XG4gIHByaXZhdGUgaTogTm9kZUlEXG4gIHByaXZhdGUgc3RlcDogbnVtYmVyXG4gIHByaXZhdGUgZ3JhcGg6IGdyYXBobGliLkdyYXBoXG4gIHByaXZhdGUgbGFzdE5vZGVWaXNpdDogeyBbIGtleTogc3RyaW5nIF06IG51bWJlciB9XG4gIHByaXZhdGUgY3VycmVudE5vZGVJRDogTm9kZUlEXG4gIHByaXZhdGUgdGFyZ2V0Tm9kZUlEOiBOb2RlSURcbiAgcHJpdmF0ZSBwYXRoOiBBcnJheTwgUG9pbnQgPlxuXG4gIGNvbnN0cnVjdG9yKCB4OiBudW1iZXIsIHk6IG51bWJlciApIHtcbiAgICB0aGlzLmkgPSBcImFcIlxuXG4gICAgdGhpcy5zdGVwID0gMFxuICAgIHRoaXMuZ3JhcGggPSBuZXcgZ3JhcGhsaWIuR3JhcGgoKVxuXG4gICAgdGhpcy5hZGROb2RlKCB4LCB5LCBmYWxzZSApXG4gICAgdGhpcy5sYXN0Tm9kZVZpc2l0ID0ge31cblxuICAgIHRoaXMubWFya05vZGVWaXNpdGVkKCB0aGlzLmN1cnJlbnROb2RlSUQgKVxuICAgIHRoaXMucGF0aCA9IFtdXG4gIH1cblxuICBhY3QoIHdhbGtlcjogV2Fsa2VyICk6IHZvaWQge1xuICAgIGlmICggdGhpcy5wYXRoLmxlbmd0aCApIHtcbiAgICAgIHRoaXMubW92ZVRvVGFyZ2V0KCB3YWxrZXIgKVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIHRoaXMudGFyZ2V0Tm9kZUlEICkge1xuICAgICAgICB0aGlzLm1hcmtOb2RlVmlzaXRlZCggdGhpcy50YXJnZXROb2RlSUQgKVxuICAgICAgICB0aGlzLmN1cnJlbnROb2RlSUQgPSB0aGlzLnRhcmdldE5vZGVJRFxuICAgICAgfVxuXG4gICAgICB0aGlzLnBpY2tVcE5ld1RhcmdldCggd2Fsa2VyIClcbiAgICAgIHRoaXMubW92ZVRvVGFyZ2V0KCB3YWxrZXIgKVxuICAgIH1cbiAgICB0aGlzLnN0ZXAgKz0gMVxuICB9XG5cbiAgLy8gVE9ETzogSWYgY2xvc2UgZW5vdWdoIHRvIGFub3RoZXIgbm9kZSwgdXNlIGl0IGluc3RlYWQuXG4gIGFkZE5vZGUoIHg6IG51bWJlciwgeTogbnVtYmVyLCB3aXRoRWRnZTogYm9vbGVhbiA9IHRydWUgKTogdm9pZCB7XG4gICAgdGhpcy5ncmFwaC5zZXROb2RlKCB0aGlzLmksIHsgeDogeCwgeTogeSB9IClcbiAgICBpZiAoIHdpdGhFZGdlICkge1xuICAgICAgdGhpcy5ncmFwaC5zZXRFZGdlKCB0aGlzLmN1cnJlbnROb2RlSUQsIHRoaXMuaSApXG4gICAgfVxuICAgIHRoaXMuY3VycmVudE5vZGVJRCA9IHRoaXMuaVxuICAgIHRoaXMuaSA9IHN1Y2MoIHRoaXMuaSApXG4gIH1cblxuICBwcml2YXRlIGJ1aWxkTmV3UGF0aCggd2Fsa2VyOiBXYWxrZXIgKTogdm9pZCB7XG4gICAgY29uc3QgcG9zOiBQb2ludCA9IHRoaXMuZ3JhcGgubm9kZSggdGhpcy50YXJnZXROb2RlSUQgKVxuXG4gICAgdGhpcy5wYXRoID0gbGVlUGF0aCggd2Fsa2VyLCAoIHgsIHkgKSA9PiB7XG4gICAgICByZXR1cm4gKCBwb3MueCA9PT0geCApICYmICggcG9zLnkgPT09IHkgKVxuICAgIH0pXG4gIH1cblxuICBwcml2YXRlIHBpY2tVcE5ld1RhcmdldCggd2Fsa2VyOiBXYWxrZXIgKTogdm9pZCB7XG4gICAgbGV0IHNlZW5MYXN0SUQ6IE5vZGVJRCA9IHRoaXMuY3VycmVudE5vZGVJRFxuICAgIGxldCBzZWVuTGFzdFN0ZXA6IG51bWJlciA9IHRoaXMubGFzdE5vZGVWaXNpdFsgc2Vlbkxhc3RJRCBdXG5cbiAgICB0aGlzLmdyYXBoLm5laWdoYm9ycyggdGhpcy5jdXJyZW50Tm9kZUlEICkuZm9yRWFjaCggKCBub2RlSUQ6IE5vZGVJRCApID0+IHtcbiAgICAgIGlmICggc2Vlbkxhc3RTdGVwID4gKCB0aGlzLmxhc3ROb2RlVmlzaXRbIG5vZGVJRCBdIHx8IDAgKSApXG4gICAgICAgIHNlZW5MYXN0SUQgPSBub2RlSURcbiAgICAgICAgc2Vlbkxhc3RTdGVwID0gdGhpcy5sYXN0Tm9kZVZpc2l0WyBzZWVuTGFzdElEIF1cbiAgICAgIH1cbiAgICApXG5cbiAgICB0aGlzLnRhcmdldE5vZGVJRCA9IHNlZW5MYXN0SURcbiAgICB0aGlzLmJ1aWxkTmV3UGF0aCggd2Fsa2VyIClcbiAgfVxuXG4gIHByaXZhdGUgbW92ZVRvVGFyZ2V0KCB3YWxrZXI6IFdhbGtlciApOiB2b2lkIHtcbiAgICBjb25zdCBuZXh0UG9pbnQ6IFBvaW50ID0gdGhpcy5wYXRoLnNoaWZ0KClcbiAgICBpZiAoIHdhbGtlci5zdGFnZU1lbW9yeVsgbmV4dFBvaW50LnggXVsgbmV4dFBvaW50LnkgXS50YW5naWJsZSApIHtcbiAgICAgIHRoaXMucGF0aCA9IFtdXG4gICAgICB0aGlzLmFjdCggd2Fsa2VyIClcbiAgICB9IGVsc2Uge1xuICAgICAgd2Fsa2VyLnggPSBuZXh0UG9pbnQueFxuICAgICAgd2Fsa2VyLnkgPSBuZXh0UG9pbnQueVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbWFya05vZGVWaXNpdGVkKCBub2RlSUQ6IE5vZGVJRCApOiB2b2lkIHtcbiAgICB0aGlzLmxhc3ROb2RlVmlzaXRbIG5vZGVJRCBdID0gdGhpcy5zdGVwXG4gIH1cbn1cblxuZXhwb3J0IHsgUGF0cm9sIH1cbiIsImltcG9ydCB7IE1BWF9YLCBNQVhfWSwgUG9pbnQsIHJhbmQsIHN1Y2MsIHR3b0RpbUFycmF5IH0gZnJvbSBcIi4uL3V0aWxzXCJcbmltcG9ydCB7IFN0YWdlLCBUeXBlLCBUaWxlVHlwZSB9IGZyb20gXCIuLi9nYW1lXCJcbmltcG9ydCB7IEFJLCBUaWxlUmVjYWxsIH0gZnJvbSBcIi4uL2FpXCJcbmltcG9ydCB7IEV4cGxvcmVyIH0gZnJvbSBcIi4uL2FpL2V4cGxvcmVyLnRzXCJcblxuLy8gVE9ETzogRW5zdXJlIHNlZW4gaXMgYnVpbGQgYmVmb3JlIGFjdCgpIGlzIGNhbGxlZCFcbmV4cG9ydCBjbGFzcyBXYWxrZXIge1xuICBhaTogQUlcbiAgdGlsZTogVHlwZVxuICBzdGFnZU1lbW9yeTogQXJyYXk8IEFycmF5PCBUaWxlUmVjYWxsID4gPlxuICByYWRpdXM6IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yKCBwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyICkge1xuICAgIHRoaXMudGlsZSA9IG5ldyBUeXBlKCBUaWxlVHlwZS5odW1hbm9pZCApXG4gICAgdGhpcy5zdGFnZU1lbW9yeSA9IHR3b0RpbUFycmF5KCBNQVhfWCwgTUFYX1ksICgpID0+IHsgcmV0dXJuIG5ldyBUaWxlUmVjYWxsKCkgfSApXG4gICAgdGhpcy5yYWRpdXMgPSAxMFxuICAgIHRoaXMuYWkgPSBuZXcgRXhwbG9yZXIoKVxuICB9XG5cbiAgYWN0KCBzdGFnZTogU3RhZ2UgKTogdm9pZCB7XG4gICAgdGhpcy5zdGFnZU1lbW9yeVsgdGhpcy54IF1bIHRoaXMueSBdLnVwZGF0ZWQgPSB0cnVlXG5cbiAgICB0aGlzLnZpc2lvbk1hc2soIHN0YWdlIClcbiAgICB0aGlzLmFpLmFjdCggdGhpcyApXG5cbiAgICB0aGlzLnN0YWdlTWVtb3J5WyB0aGlzLnggXVsgdGhpcy55IF0udXBkYXRlZCA9IHRydWVcbiAgfVxuXG4gIHByaXZhdGUgdmlzaW9uTWFzayggc3RhZ2U6IFN0YWdlICk6IHZvaWQge1xuICAgIHRoaXMuc3RhZ2VNZW1vcnkuZm9yRWFjaCggKCByb3c6IEFycmF5PCBUaWxlUmVjYWxsID4gKSA9PiB7XG4gICAgICByb3cuZm9yRWFjaCggKCB0aWxlOiBUaWxlUmVjYWxsICkgPT4ge1xuICAgICAgICB0aWxlLnVwZGF0ZWQgPSB0aWxlLnZpc2libGVcbiAgICAgICAgdGlsZS52aXNpYmxlID0gZmFsc2VcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGNvbnN0IHNlZSA9ICggeDogbnVtYmVyLCB5OiBudW1iZXIsIHRhbmdpYmxlOiBib29sZWFuICk6IHZvaWQgPT4ge1xuICAgICAgdGhpcy5zdGFnZU1lbW9yeVsgeCBdWyB5IF0udmlzaWJsZSA9IHRydWVcbiAgICAgIHRoaXMuc3RhZ2VNZW1vcnlbIHggXVsgeSBdLnNlZW4gPSB0cnVlXG4gICAgICB0aGlzLnN0YWdlTWVtb3J5WyB4IF1bIHkgXS50YW5naWJsZSA9IHRhbmdpYmxlXG4gICAgfVxuXG4gICAgLyogTG9zIGNhbGN1bGF0aW9uICovXG4gICAgY29uc3QgbG9zID0gKCB4MDogbnVtYmVyLCAgeTA6IG51bWJlciwgIHgxOiBudW1iZXIsICB5MTogbnVtYmVyICkgPT4ge1xuICAgICAgY29uc3QgZHggPSB4MSAtIHgwXG4gICAgICBjb25zdCBkeSA9IHkxIC0geTBcbiAgICAgIGNvbnN0IHN4ID0geDAgPCB4MSA/IDEgOiAtMVxuICAgICAgY29uc3Qgc3kgPSB5MCA8IHkxID8gMSA6IC0xXG5cbiAgICAgIC8vIHN4IGFuZCBzeSBhcmUgc3dpdGNoZXMgdGhhdCBlbmFibGUgdXMgdG8gY29tcHV0ZSB0aGUgTE9TIGluIGEgc2luZ2xlIHF1YXJ0ZXIgb2YgeC95IHBsYW5cbiAgICAgIGxldCB4bmV4dCA9IHgwXG4gICAgICBsZXQgeW5leHQgPSB5MFxuXG4gICAgICBjb25zdCBkZW5vbSA9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSlcblxuICAgICAgY29uc3QgZGlzdCA9IDAuNSAqIGRlbm9tXG5cbiAgICAgIHdoaWxlICh4bmV4dCAhPT0geDEgfHwgeW5leHQgIT09IHkxKSB7XG4gICAgICAgIGlmICggc3RhZ2UuZmllbGRbIHhuZXh0IF1bIHluZXh0IF0udGFuZ2libGUoKSApIHtcbiAgICAgICAgICBzZWUoIHhuZXh0LCB5bmV4dCwgdHJ1ZSApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIE1hdGguYWJzKCBkeSAqICggeG5leHQgLSB4MCArIHN4ICkgLSBkeCAqICggeW5leHQgLSB5MCApICkgPCBkaXN0ICkge1xuICAgICAgICAgIHhuZXh0ICs9IHN4XG4gICAgICAgIH0gZWxzZSBpZiAoIE1hdGguYWJzKCBkeSAqICggeG5leHQgLSB4MCApIC0gZHggKiAoIHluZXh0IC0geTAgKyBzeSApICkgPCBkaXN0ICkge1xuICAgICAgICAgIHluZXh0ICs9IHN5XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeG5leHQgKz0gc3hcbiAgICAgICAgICB5bmV4dCArPSBzeVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNlZSggeDEsIHkxLCBzdGFnZS5maWVsZFsgeDEgXVsgeTEgXS50YW5naWJsZSgpIClcbiAgICB9XG5cbiAgICBmb3IgKCBsZXQgaSA9IC10aGlzLnJhZGl1czsgaSA8PSB0aGlzLnJhZGl1czsgaSsrIClcbiAgICAgIGZvciAoIGxldCBqID0gLXRoaXMucmFkaXVzOyBqIDw9IHRoaXMucmFkaXVzOyBqKysgKVxuICAgICAgICBpZiAoIGkgKiBpICsgaiAqIGogPCB0aGlzLnJhZGl1cyAqIHRoaXMucmFkaXVzIClcbiAgICAgICAgICBsb3MoIHRoaXMueCwgdGhpcy55LCB0aGlzLnggKyBpLCB0aGlzLnkgKyBqIClcbiAgfVxufVxuXG4iLCJpbXBvcnQgeyB0d29EaW1BcnJheSB9IGZyb20gXCIuL3V0aWxzXCJcbmltcG9ydCB7IFdhbGtlciB9IGZyb20gXCIuL2NyZWF0dXJlL3dhbGtlclwiXG5pbXBvcnQgeyBUaWxlUmVjYWxsIH0gZnJvbSBcIi4vYWlcIlxuXG50eXBlIFJHQkNvbG9yID0gWyBudW1iZXIsIG51bWJlciwgbnVtYmVyIF1cblxuaW50ZXJmYWNlIFRpbGVPcHRzIHtcbiAgdmlzaWJsZT86IGJvb2xlYW5cbiAgdGFuZ2libGU/OiBib29sZWFuXG59XG5cbmNsYXNzIERpc3BsYXlUaWxlIHtcbiAgdmlzaWJsZTogYm9vbGVhblxuICB0YW5naWJsZTogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yKCBwdWJsaWMgY2hhcjogc3RyaW5nLCBwdWJsaWMgZm9yZWdyb3VuZDogUkdCQ29sb3IsIHB1YmxpYyBiYWNrZ3JvdW5kOiBSR0JDb2xvcixcbiAgICAgICAgICAgICAgb3B0czogVGlsZU9wdHMgPSB7fSApIHtcbiAgICB0aGlzLnZpc2libGUgID0gKCBvcHRzLnZpc2libGUgPT09IHVuZGVmaW5lZCApID8gdHJ1ZSA6IG9wdHMudmlzaWJsZVxuICAgIHRoaXMudGFuZ2libGUgPSAoIG9wdHMudGFuZ2libGUgPT09IHVuZGVmaW5lZCApID8gdHJ1ZSA6IG9wdHMudGFuZ2libGVcbiAgfVxufVxuXG5lbnVtIEVmZmVjdCB7XG4gIFNoYWRlZFxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvciggcHJpdmF0ZSBkaXNwbGF5OiBST1QuRGlzcGxheSApIHsgIH1cblxuICByZW5kZXJTdGFnZSggc3RhZ2U6IFN0YWdlLCB3YWxrZXI6IFdhbGtlciApOiB2b2lkIHtcbiAgICB3YWxrZXIuc3RhZ2VNZW1vcnkuZm9yRWFjaCggKCByb3c6IEFycmF5PCBUaWxlUmVjYWxsID4sIHg6IG51bWJlciApID0+IHtcbiAgICAgIHJvdy5mb3JFYWNoKCAoIHRpbGU6IFRpbGVSZWNhbGwsIHk6IG51bWJlciApID0+IHtcbiAgICAgICAgaWYgKCB0aWxlLnVwZGF0ZWQgKSB7XG4gICAgICAgICAgaWYgKCB0aWxlLnZpc2libGUgKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclRpbGUoIHgsIHksIHN0YWdlLmF0KCB4LCB5ICkucHJpbnRUaWxlKCkgKVxuICAgICAgICAgIH0gZWxzZSBpZiAoIHRpbGUuc2VlbiApIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyVGlsZSggeCwgeSwgc3RhZ2UuYXQoIHgsIHkgKS5wcmludFRpbGUoKSwgWyBFZmZlY3QuU2hhZGVkIF0gKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyVGlsZSggeDogbnVtYmVyLCB5OiBudW1iZXIsIHRpbGU6IERpc3BsYXlUaWxlLCBlZmZlY3RzOiBBcnJheTwgRWZmZWN0ID4gPSBbXSApOiB2b2lkIHtcbiAgICBjb25zdCBjb2xvcnM6IHN0cmluZyA9IHRoaXMuYnVpbGRDb2xvciggdGlsZS5mb3JlZ3JvdW5kLCB0aWxlLmJhY2tncm91bmQsIGVmZmVjdHMgKVxuICAgIHRoaXMuZGlzcGxheS5kcmF3VGV4dCggeCwgeSwgYCR7IGNvbG9ycyB9JHsgdGlsZS5jaGFyIH1gIClcbiAgfVxuXG4gIGJ1aWxkQ29sb3IoIGZvcmVncm91bmQ6IFJHQkNvbG9yLCBiYWNrZ3JvdW5kOiBSR0JDb2xvciwgZWZmZWN0czogQXJyYXk8IEVmZmVjdCA+ICk6IHN0cmluZyB7XG4gICAgbGV0IGZDb2xvcjogUkdCQ29sb3IgPSBmb3JlZ3JvdW5kLCBiQ29sb3I6IFJHQkNvbG9yID0gYmFja2dyb3VuZFxuXG4gICAgaWYgKCBlZmZlY3RzLmluZGV4T2YoIEVmZmVjdC5TaGFkZWQgKSA+PSAwICkge1xuICAgICAgY29uc3QgZiA9ICggZkNvbG9yWyAwIF0gKyBmQ29sb3JbIDEgXSArIGZDb2xvclsgMiBdICkgLyAzXG4gICAgICBmQ29sb3IgPSBbIGYsIGYsIGYgXVxuXG4gICAgICBjb25zdCBiID0gKCBiQ29sb3JbIDAgXSArIGJDb2xvclsgMSBdICsgYkNvbG9yWyAyIF0gKSAvIDNcbiAgICAgIGJDb2xvciA9IFsgYiwgYiwgYiBdXG4gICAgfVxuXG4gICAgcmV0dXJuIGAlY3skeyBST1QuQ29sb3IudG9SR0IoIGZDb2xvciApIH19JWJ7JHsgUk9ULkNvbG9yLnRvUkdCKCBiQ29sb3IgKSB9fWBcbiAgfVxufVxuXG5jb25zdCB3aGl0ZTogIFJHQkNvbG9yID0gWyAyNTUsIDI1NSwgMjU1IF1cbmNvbnN0IGJsYWNrOiAgUkdCQ29sb3IgPSBbICAgMCwgICAwLCAgIDAgXVxuY29uc3QgcmVkOiAgICBSR0JDb2xvciA9IFsgMjU1LCAgIDAsICAgMCBdXG5jb25zdCBncmVlbjogIFJHQkNvbG9yID0gWyAgIDAsIDI1NSwgICAwIF1cbmNvbnN0IGJsdWU6ICAgUkdCQ29sb3IgPSBbICAgMCwgICAwLCAyNTUgXVxuY29uc3QgeWVsbG93OiBSR0JDb2xvciA9IFsgMTUwLCAxNTAsICAgMCBdXG5cbmV4cG9ydCBlbnVtIFRpbGVUeXBlIHtcbiAgd2FsbCxcbiAgc3BhY2UsXG4gIHVua25vd24sXG4gIGh1bWFub2lkXG59XG5cbmV4cG9ydCBjbGFzcyBUeXBlIHtcbiAgcHVibGljIHN0YXRpYyBnZXQgdGlsZVR5cGVzKCk6IHsgWyBrZXk6IHN0cmluZyBdOiBEaXNwbGF5VGlsZSB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgWyBUaWxlVHlwZS53YWxsIF06ICAgICBuZXcgRGlzcGxheVRpbGUoIFwiI1wiLCB5ZWxsb3csIHllbGxvdywgeyB0YW5naWJsZTogdHJ1ZSwgdmlzaWJsZTogdHJ1ZSAgfSAgKSxcbiAgICAgIFsgVGlsZVR5cGUuc3BhY2UgXTogICAgbmV3IERpc3BsYXlUaWxlKCBcIi5cIiwgeWVsbG93LCBibGFjaywgeyB0YW5naWJsZTogZmFsc2UsIHZpc2libGU6IHRydWUgICB9ICksXG4gICAgICBbIFRpbGVUeXBlLnVua25vd24gXTogIG5ldyBEaXNwbGF5VGlsZSggXCIgXCIsIGJsYWNrLCB3aGl0ZSwgeyB0YW5naWJsZTogdHJ1ZSwgdmlzaWJsZTogZmFsc2UgfSAgKSxcbiAgICAgIFsgVGlsZVR5cGUuaHVtYW5vaWQgXTogbmV3IERpc3BsYXlUaWxlKCBcIkBcIiwgZ3JlZW4sIGJsYWNrLCB7IHRhbmdpYmxlOiB0cnVlLCB2aXNpYmxlOiB0cnVlICB9ICApXG4gICAgfVxuICB9XG5cbiAgY29uc3RydWN0b3IoIHB1YmxpYyB0eXBlOiBUaWxlVHlwZSApIHt9XG5cbiAgdGFuZ2libGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucHJpbnRUaWxlKCkudGFuZ2libGVcbiAgfVxuXG4gIHByaW50VGlsZSgpOiBEaXNwbGF5VGlsZSB7XG4gICAgcmV0dXJuIFR5cGUudGlsZVR5cGVzWyB0aGlzLnR5cGUgXVxuICB9XG59XG5cbmNvbnN0IG5ld1dhbGwgPSBmdW5jdGlvbigpOiBUeXBlIHtcbiAgcmV0dXJuIG5ldyBUeXBlKCBUaWxlVHlwZS53YWxsIClcbn1cblxuZXhwb3J0IGNsYXNzIFN0YWdlIHtcbiAgZmllbGQ6IEFycmF5PCBBcnJheTwgVHlwZSA+ID5cblxuICBjb25zdHJ1Y3RvciggcHVibGljIGRpbVg6IG51bWJlciwgcHVibGljIGRpbVk6IG51bWJlciwgYmFzZUJsb2NrOiAoICgpID0+IFR5cGUgKSA9IG5ld1dhbGwgKSB7XG4gICAgdGhpcy5maWVsZCA9IHR3b0RpbUFycmF5KCBkaW1YLCBkaW1ZLCBiYXNlQmxvY2sgKVxuICB9XG5cbiAgYXQoIHg6IG51bWJlciwgeTogbnVtYmVyICk6IFR5cGUge1xuICAgIHJldHVybiB0aGlzLmZpZWxkWyB4IF1bIHkgXVxuICB9XG59XG4iLCJpbXBvcnQgeyBSZWN0LCBQb2ludCwgcmFuZCwgbWluLCBtYXggfSBmcm9tIFwiLi4vdXRpbHNcIlxuaW1wb3J0IHsgU3RhZ2UsIFR5cGUsIFRpbGVUeXBlIH0gZnJvbSBcIi4uL2dhbWVcIlxuXG5jb25zdCBUSElDS05FU1MgPSAwXG5cbmNvbnN0IE1JTl9TSVpFOiBudW1iZXIgPSA0XG5jb25zdCBNQVhfU0laRTogbnVtYmVyID0gMTBcbmNvbnN0IFJPT01TX0NPVU5UOiBudW1iZXIgPSA1XG5cbmNvbnN0IG5ld1NwYWNlID0gZnVuY3Rpb24oKTogVHlwZSB7XG4gIHJldHVybiBuZXcgVHlwZSggVGlsZVR5cGUuc3BhY2UgKVxufVxuXG5jb25zdCBnZW5lcmF0ZSA9IGZ1bmN0aW9uICggZGltWDogbnVtYmVyLCBkaW1ZOiBudW1iZXIgKTogU3RhZ2Uge1xuICBjb25zdCBkdW5nZW9uID0gbmV3IER1bmdlb25HZW5lcmF0b3IoIGRpbVgsIGRpbVkgKVxuXG4gIGxldCBzdGFnZSA9IG5ldyBTdGFnZSggZGltWCwgZGltWSApXG5cbiAgZm9yICggbGV0IGkgPSAwOyBpIDwgZHVuZ2Vvbi5yb29tcy5sZW5ndGg7IGkrKyApXG4gICAgZHVuZ2Vvbi5yb29tc1sgaSBdLmFkZCggc3RhZ2UgKVxuXG4gIGZvciAoIGxldCBpID0gMDsgaSA8IGR1bmdlb24ucm9hZHMubGVuZ3RoOyBpKysgKVxuICAgIGR1bmdlb24ucm9hZHNbIGkgXS5hZGQoIHN0YWdlIClcblxuICByZXR1cm4gc3RhZ2Vcbn1cblxuY2xhc3MgUm9vbSBleHRlbmRzIFJlY3Qge1xuICBub3RDcm9zcyggcmVjdDogUmVjdCApOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCByZWN0LnggLSBUSElDS05FU1MgPiB0aGlzLnggKyB0aGlzLncgKSB8fFxuICAgICAgKCByZWN0LnkgLSBUSElDS05FU1MgPiB0aGlzLnkgKyB0aGlzLmggKSB8fFxuICAgICAgKCByZWN0LnggKyByZWN0LncgPCB0aGlzLnggLSBUSElDS05FU1MgKSB8fFxuICAgICAgKCByZWN0LnkgKyByZWN0LmggPCB0aGlzLnkgLSBUSElDS05FU1MgKVxuICB9XG5cbiAgcG9pbnRXaXRoaW4oKTogUG9pbnQge1xuICAgIHJldHVybiB7XG4gICAgICB4OiB0aGlzLnggKyAxICsgcmFuZCggdGhpcy53IC0gMSApLFxuICAgICAgeTogdGhpcy55ICsgMSArIHJhbmQoIHRoaXMuaCAtIDEgKVxuICAgIH1cbiAgfVxuXG4gIGFkZCggc3RhZ2U6IFN0YWdlICk6IHZvaWQge1xuICAgIGxldCBpOiBudW1iZXIgPSAwXG4gICAgd2hpbGUgKCBpIDwgdGhpcy53ICkge1xuICAgICAgbGV0IGo6IG51bWJlciA9IDBcbiAgICAgIHdoaWxlICggaiA8IHRoaXMuaCApIHtcbiAgICAgICAgc3RhZ2UuZmllbGRbIHRoaXMueCArIGkgXVsgdGhpcy55ICsgaiBdID0gbmV3U3BhY2UoKVxuICAgICAgICBqKytcbiAgICAgIH1cblxuICAgICAgaSsrXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFJvYWQgZXh0ZW5kcyBSZWN0IHtcbiAgbGluZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciggeDogbnVtYmVyLCB5OiBudW1iZXIsIHc6IG51bWJlciwgaDogbnVtYmVyICkge1xuICAgIHN1cGVyKCB4LCB5LCB3LCBoIClcbiAgICB0aGlzLmxpbmVkID0gKCAoIHggPj0gdyApICYmICggeSA+PSBoICkgKSB8fCAoIHcgPj0geCApICYmICggaCA+PSB5IClcbiAgfVxuXG4gIGFkZCggc3RhZ2U6IFN0YWdlICk6IHZvaWQge1xuICAgIGxldCBbIGh4LCBoeSwgdyBdID0gdGhpcy5ob3Jpem9udGFsTGluZSgpXG5cbiAgICBsZXQgaSA9IDBcbiAgICB3aGlsZSAoIGkgPCB3ICkge1xuICAgICAgc3RhZ2UuZmllbGRbIGh4ICsgaSBdWyBoeSBdID0gbmV3U3BhY2UoKVxuICAgICAgaSArPSAxXG4gICAgfVxuXG4gICAgbGV0IFsgdngsIHZ5LCBoIF0gPSB0aGlzLnZlcnRpY2FsbExpbmUoKVxuICAgIGxldCBqID0gMFxuICAgIHdoaWxlICggaiA8IGggKSB7XG4gICAgICBzdGFnZS5maWVsZFsgdnggXVsgdnkgKyBqIF0gPSBuZXdTcGFjZSgpXG4gICAgICBqICs9IDFcbiAgICB9XG4gIH1cblxuICBob3Jpem9udGFsTGluZSgpOiBbIG51bWJlciwgbnVtYmVyLCBudW1iZXIgXSB7XG4gICAgLy8geFxuICAgIC8vIHxcXFxuICAgIC8vIC4teFxuICAgIGlmICggdGhpcy5saW5lZCApXG4gICAgICByZXR1cm4gWyBNYXRoLm1pbiggdGhpcy54LCB0aGlzLncgKSwgTWF0aC5tYXgoIHRoaXMueSwgdGhpcy5oICksIE1hdGguYWJzKCB0aGlzLncgLSB0aGlzLnggKSBdXG4gICAgLy8gLi14XG4gICAgLy8gfC9cbiAgICAvLyB4XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIFsgTWF0aC5taW4oIHRoaXMueCwgdGhpcy53ICksIE1hdGgubWluKCB0aGlzLnksIHRoaXMuaCApLCBNYXRoLmFicyggdGhpcy53IC0gdGhpcy54ICkgXVxuICB9XG5cbiAgdmVydGljYWxsTGluZSgpOiBbIG51bWJlciwgbnVtYmVyLCBudW1iZXIgXSB7XG4gICAgLy8geFxuICAgIC8vIHxcXFxuICAgIC8vIC4teFxuICAgIGlmICggdGhpcy5saW5lZCApXG4gICAgICByZXR1cm4gWyBNYXRoLm1pbiggdGhpcy54LCB0aGlzLncgKSwgTWF0aC5taW4oIHRoaXMueSwgdGhpcy5oICksIE1hdGguYWJzKCB0aGlzLmggLSB0aGlzLnkgKSBdXG4gICAgLy8gLi14XG4gICAgLy8gfC9cbiAgICAvLyB4XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIFsgTWF0aC5taW4oIHRoaXMueCwgdGhpcy53ICksIE1hdGgubWluKCB0aGlzLnksIHRoaXMuaCApLCBNYXRoLmFicyggdGhpcy5oIC0gdGhpcy55ICkgXVxuICB9XG59XG5cbmNsYXNzIER1bmdlb25HZW5lcmF0b3Ige1xuICByb29tczogQXJyYXk8IFJvb20gPlxuICByb2FkczogQXJyYXk8IFJvYWQgPlxuXG4gIGNvbnN0cnVjdG9yKCBwcm90ZWN0ZWQgbWF4WDogbnVtYmVyLCBwcm90ZWN0ZWQgbWF4WTogbnVtYmVyICkge1xuICAgIGxldCByb29tczogQXJyYXk8IFJvb20gPiA9IFtdXG5cbiAgICBsZXQgaSA9IDBcbiAgICB3aGlsZSAoIGkgPCBST09NU19DT1VOVCApIHtcbiAgICAgIHJvb21zLnB1c2goIHRoaXMuZ2VuZXJhdGVSb29tKCkgKVxuICAgICAgaSArPSAxXG4gICAgfVxuXG4gICAgdGhpcy5yb29tcyA9IHRoaXMubm9ybWFsaXplKCB0aGlzLmZ1enppZnlSb29tcyggcm9vbXMgKSApXG4gICAgdGhpcy5yb2FkcyA9IHRoaXMuYnVpbGRSb2FkcyggdGhpcy5yb29tcyApXG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlUm9vbSgpOiBSb29tIHtcbiAgICByZXR1cm4gbmV3IFJvb20oXG4gICAgICAwLFxuICAgICAgMCxcbiAgICAgIE1JTl9TSVpFICsgcmFuZCggTUFYX1NJWkUgLSBNSU5fU0laRSApLFxuICAgICAgTUlOX1NJWkUgKyByYW5kKCBNQVhfU0laRSAtIE1JTl9TSVpFIClcbiAgICApXG4gIH1cblxuICBwcml2YXRlIGZ1enppZnlSb29tcyggcm9vbXM6IEFycmF5PCBSb29tID4gKTogQXJyYXk8IFJvb20gPiB7XG4gICAgbGV0IHBpY2tlZFJvb21zOiBBcnJheTwgUm9vbSA+ID0gWyByb29tcy5zaGlmdCgpIF1cblxuICAgIHdoaWxlICggcm9vbXMubGVuZ3RoICkge1xuICAgICAgbGV0IGN1cnJlbnRSb29tOiBSb29tID0gcm9vbXMuc2hpZnQoKVxuXG4gICAgICBsZXQgYW5nbGU6IG51bWJlciA9IHJhbmQoIDM2MCApIC8gMTgwICogTWF0aC5QSVxuXG4gICAgICAvLyBUT0RPOiBCdWlsZCB0YWJsZSB3aXRoIHRoZXNlIHZhbHVlcy5cbiAgICAgIGNvbnN0IGNvczogbnVtYmVyID0gTWF0aC5jb3MoIGFuZ2xlIClcbiAgICAgIGNvbnN0IHNpbjogbnVtYmVyID0gTWF0aC5zaW4oIGFuZ2xlIClcbiAgICAgIGxldCBsOiBudW1iZXIgPSAwXG4gICAgICBsZXQgZHg6IG51bWJlciA9IDBcbiAgICAgIGxldCBkeTogbnVtYmVyID0gMFxuXG4gICAgICB3aGlsZSAoICFwaWNrZWRSb29tcy5ldmVyeSggKCByb29tICkgPT4gY3VycmVudFJvb20ubm90Q3Jvc3MoIHJvb20gKSApKSB7XG4gICAgICAgIGxldCBuZHggPSBNYXRoLnJvdW5kKCBsICogY29zIClcbiAgICAgICAgbGV0IG5keSA9IE1hdGgucm91bmQoIGwgKiBzaW4gKVxuXG4gICAgICAgIHdoaWxlICggdHJ1ZSApIHtcbiAgICAgICAgICBsICs9IDFcbiAgICAgICAgICBuZHggPSBNYXRoLnJvdW5kKCBsICogY29zIClcbiAgICAgICAgICBuZHkgPSBNYXRoLnJvdW5kKCBsICogc2luIClcblxuICAgICAgICAgIGlmICggbmR4ICE9PSBkeCB8fCBuZHkgIT09IGR5ICkge1xuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50Um9vbS5tb3ZlKCBuZHggLSBkeCwgbmR5IC0gZHkgKVxuICAgICAgICBkeCA9IG5keFxuICAgICAgICBkeSA9IG5keVxuICAgICAgfVxuXG4gICAgICBwaWNrZWRSb29tcy5wdXNoKCBjdXJyZW50Um9vbSApXG4gICAgfVxuXG4gICAgcmV0dXJuIHBpY2tlZFJvb21zXG4gIH1cblxuICBwcml2YXRlIG5vcm1hbGl6ZSggcm9vbXM6IEFycmF5PCBSb29tID4gKTogQXJyYXk8IFJvb20gPiB7XG4gICAgY29uc3QgbWluWCA9IG1pbiggcm9vbXMubWFwKCAoIHJvb20gKSA9PiByb29tLnggKSApIC0gMVxuICAgIGNvbnN0IG1pblkgPSBtaW4oIHJvb21zLm1hcCggKCByb29tICkgPT4gcm9vbS55ICkgKSAtIDFcbiAgICByb29tcy5mb3JFYWNoKCAoIHJvb20gKSA9PiB7IHJvb20ubW92ZSggLSBtaW5YLCAtIG1pblkgKSB9IClcblxuICAgIHJldHVybiByb29tcy5maWx0ZXIoICggcm9vbTogUm9vbSApID0+IHtcbiAgICAgIHJldHVybiAoIHJvb20ueCArIHJvb20udyA8IHRoaXMubWF4WCApICYmICggcm9vbS55ICsgcm9vbS5oIDwgdGhpcy5tYXhZIClcbiAgICB9KVxuICB9XG5cbiAgcHJpdmF0ZSBidWlsZFJvYWRzKCByb29tczogQXJyYXk8IFJvb20gPiApOiBBcnJheTwgUm9hZCA+IHtcbiAgICBsZXQgcG9pbnRzOiBBcnJheTwgUG9pbnQgPiA9IHJvb21zLm1hcCggKCByb29tICkgPT4geyByZXR1cm4gcm9vbS5wb2ludFdpdGhpbigpIH0gKVxuXG4gICAgbGV0IGNvbm5lY3RlZFBvaW50czogQXJyYXk8IFBvaW50ID4gPSBbIHBvaW50cy5zaGlmdCgpIF1cbiAgICBsZXQgcm9hZHM6IEFycmF5PCBSb2FkID4gPSBbXVxuXG4gICAgY29uc3QgZGlzdGFuY2UgPSBmdW5jdGlvbiggcG9pbnQxOiBQb2ludCwgcG9pbnQyOiBQb2ludCApOiBudW1iZXIge1xuICAgICAgLy8gTm8gbmVlZCB0byBjYWxjIHNxdWFyZSByb290IHNpbmNlIGl0J3MgYmVpbmcgdXNlZCBmb3IgY29tcGFyaXNvbiBvbmx5LlxuICAgICAgcmV0dXJuICggcG9pbnQxLnggLSBwb2ludDIueCApICoqIDIgKyAoIHBvaW50MS55IC0gcG9pbnQyLnkgKSAqKiAyXG4gICAgfVxuXG4gICAgd2hpbGUgKCBwb2ludHMubGVuZ3RoICkge1xuICAgICAgbGV0IGN1cnJlbnRQb2ludCA9IHBvaW50cy5zaGlmdCgpXG5cbiAgICAgIGxldCBwb2ludFRvQ29ubmVjdCA9IGNvbm5lY3RlZFBvaW50c1sgMCBdXG4gICAgICBsZXQgbWluRGlzdGFuY2UgPSBkaXN0YW5jZSggY3VycmVudFBvaW50LCBwb2ludFRvQ29ubmVjdCApXG5cbiAgICAgIGNvbm5lY3RlZFBvaW50cy5mb3JFYWNoKCAoIHBvaW50ICkgPT4ge1xuICAgICAgICBjb25zdCBjdXJyZW50RGlzdGFuY2UgPSBkaXN0YW5jZSggcG9pbnQsIGN1cnJlbnRQb2ludCApXG4gICAgICAgIGlmICggY3VycmVudERpc3RhbmNlIDwgbWluRGlzdGFuY2UgKSB7XG4gICAgICAgICAgcG9pbnRUb0Nvbm5lY3QgPSBwb2ludFxuICAgICAgICAgIG1pbkRpc3RhbmNlID0gY3VycmVudERpc3RhbmNlXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGNvbm5lY3RlZFBvaW50cy5wdXNoKCBjdXJyZW50UG9pbnQgKVxuXG4gICAgICByb2Fkcy5wdXNoKCBuZXcgUm9hZChcbiAgICAgICAgY3VycmVudFBvaW50LngsXG4gICAgICAgIGN1cnJlbnRQb2ludC55LFxuICAgICAgICBwb2ludFRvQ29ubmVjdC54LFxuICAgICAgICBwb2ludFRvQ29ubmVjdC55XG4gICAgICApKVxuICAgIH1cblxuICAgIHJldHVybiByb2Fkc1xuICB9XG59XG5cbmV4cG9ydCB7IGdlbmVyYXRlIH1cbiIsImxldCBibG9jazogSlF1ZXJ5ID0gdW5kZWZpbmVkXG5cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICBwdWJsaWMgc3RhdGljIGluZm8oIG1lc3NhZ2U6IHN0cmluZyApOiB2b2lkIHtcbiAgICB0aGlzLndpdGhDbGFzcyggXCJpbmZvXCIsIG1lc3NhZ2UgKVxuICB9XG5cbiAgcHVibGljIHN0YXRpYyB3YXJuaW5nKCBtZXNzYWdlOiBzdHJpbmcgKTogdm9pZCB7XG4gICAgdGhpcy53aXRoQ2xhc3MoIFwid2FybmluZ1wiLCBtZXNzYWdlIClcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgZGFuZ2VyKCBtZXNzYWdlOiBzdHJpbmcgKTogdm9pZCB7XG4gICAgdGhpcy53aXRoQ2xhc3MoIFwiZGFuZ2VyXCIsIG1lc3NhZ2UgKVxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgd2l0aENsYXNzKCBjbGFzc2VzOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyApOiB2b2lkIHtcbiAgICAvLyBgPHRyIGNsYXNzPSdoaWRkZW4nPlxuICAgIHRoaXMuZ2V0KCkuYXBwZW5kKFxuICAgICAgYDx0cj5cbiAgICAgICAgPHRkPiR7IG1vbWVudCgpLmZvcm1hdCggXCJoaDptbTpzc1wiICkgfTwvdGQ+XG4gICAgICAgIDx0ZCBjbGFzcz0nJHsgY2xhc3NlcyB9Jz4keyBtZXNzYWdlIH08L3RkPlxuICAgICAgICA8L3RyPmBcbiAgICApXG4gICAgLy8gJCggXCJ0ci5oaWRkZW5cIiApLmZhZGVJbigpXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBnZXQoKTogSlF1ZXJ5IHtcbiAgICByZXR1cm4gYmxvY2sgPyBibG9jayA6ICggYmxvY2sgPSAkKCBcIiNnYW1lLWxvZ3NcIiApIClcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIFJlY3Qge1xuICB4OiBudW1iZXJcbiAgeTogbnVtYmVyXG4gIHc6IG51bWJlclxuICBoOiBudW1iZXJcblxuICBjb25zdHJ1Y3RvciggeDogbnVtYmVyLCB5OiBudW1iZXIsIHc6IG51bWJlciwgaDogbnVtYmVyICkge1xuICAgIC8vIFRPRE86IFZhbGlkYXRlP1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gICAgdGhpcy53ID0gd1xuICAgIHRoaXMuaCA9IGhcbiAgfVxuXG4gIG1vdmUoIHg6IG51bWJlciwgeTogbnVtYmVyICk6IHZvaWQge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgTUFYX1g6IG51bWJlciA9IDEwMFxuZXhwb3J0IGNvbnN0IE1BWF9ZOiBudW1iZXIgPSAxMDBcblxuZXhwb3J0IGNvbnN0IHN1Y2MgPSBmdW5jdGlvbiAoIGM6IHN0cmluZyApOiBzdHJpbmcge1xuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggYy5jaGFyQ29kZUF0KCAwICkgKyAxIClcbn1cblxuZXhwb3J0IGNvbnN0IHJhbmQgPSBmdW5jdGlvbiAoIG1heDogbnVtYmVyICk6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogbWF4IClcbn1cblxuLyogdHNsaW50OmRpc2FibGUgbm8tYW55ICovXG5leHBvcnQgY29uc3QgdHdvRGltQXJyYXkgPSBmdW5jdGlvbiAoIGRpbVg6IG51bWJlciwgZGltWTogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogKCB4OiBudW1iZXIsIHk6IG51bWJlciApID0+IGFueSApOiBBcnJheTxBcnJheTxhbnk+PiB7XG4gIGxldCBmaWVsZCA9IEFycmF5KCBkaW1YIClcblxuICBsZXQgaSA9IDBcbiAgd2hpbGUgKCBpIDwgZGltWCApIHtcbiAgICBmaWVsZFtpXSA9IG5ldyBBcnJheShkaW1ZKVxuICAgIGxldCBqID0gMFxuICAgIHdoaWxlICggaiA8IGRpbVkgKSB7XG4gICAgICBmaWVsZFtpXVtqXSA9IHZhbHVlKCBpLCBqIClcbiAgICAgIGorK1xuICAgIH1cbiAgICBpKytcbiAgfVxuXG4gIHJldHVybiBmaWVsZFxufVxuXG5leHBvcnQgY29uc3QgbWF4ID0gZnVuY3Rpb24oIGxpc3Q6IEFycmF5PCBudW1iZXIgPiApOiBudW1iZXIge1xuICByZXR1cm4gTWF0aC5tYXguYXBwbHkoIE1hdGgsIGxpc3QgKVxufVxuXG5leHBvcnQgY29uc3QgbWluID0gZnVuY3Rpb24oIGxpc3Q6IEFycmF5PCBudW1iZXIgPiApOiBudW1iZXIge1xuICByZXR1cm4gTWF0aC5taW4uYXBwbHkoIE1hdGgsIGxpc3QgKVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvaW50IHtcbiAgeDogbnVtYmVyLFxuICB5OiBudW1iZXJcbn1cbiIsImltcG9ydCB7IE1BWF9YLCBNQVhfWSwgUmVjdCB9IGZyb20gXCIuL2phdmFzY3JpcHQvdXRpbHNcIlxuaW1wb3J0IHsgUmVuZGVyZXIsIFN0YWdlIH0gZnJvbSBcIi4vamF2YXNjcmlwdC9nYW1lXCJcbmltcG9ydCB7IFdhbGtlciB9IGZyb20gXCIuL2phdmFzY3JpcHQvY3JlYXR1cmUvd2Fsa2VyXCJcblxuaW1wb3J0ICogYXMgRHJhd25HZW5lcmF0b3IgZnJvbSBcIi4vamF2YXNjcmlwdC9nZW5lcmF0b3JzL2RyYXduXCJcbmltcG9ydCAqIGFzIER1bmdlb25HZW5lcmF0b3IgZnJvbSBcIi4vamF2YXNjcmlwdC9nZW5lcmF0b3JzL2R1bmdlb25cIlxuaW1wb3J0ICogYXMgTWF6ZUdlbmVyYXRvciBmcm9tIFwiLi9qYXZhc2NyaXB0L2dlbmVyYXRvcnMvbWF6ZVwiXG5cbiQoIGZ1bmN0aW9uKCk6IHZvaWQge1xuICBpZiAoIVJPVC5pc1N1cHBvcnRlZCgpKSB7XG4gICAgYWxlcnQoXCJUaGUgcm90LmpzIGxpYnJhcnkgaXNuJ3Qgc3VwcG9ydGVkIGJ5IHlvdXIgYnJvd3Nlci5cIilcbiAgfSBlbHNlIHtcbiAgICAvLyBDcmVhdGUgYSBkaXNwbGF5IDgwIGNoYXJhY3RlcnMgd2lkZSBhbmQgMjAgY2hhcmFjdGVycyB0YWxsXG4gICAgY29uc3QgZGlzcGxheSA9IG5ldyBST1QuRGlzcGxheSh7IGhlaWdodDogTUFYX1ksIHdpZHRoOiBNQVhfWCB9KVxuXG4gICAgLy8gQWRkIHRoZSBjb250YWluZXIgdG8gb3VyIEhUTUwgcGFnZVxuICAgICQoIFwiI2dhbWUtc2NyZWVuXCIgKS5hcHBlbmQoIGRpc3BsYXkuZ2V0Q29udGFpbmVyKCkgKVxuXG4gICAgbGV0IHN0YWdlID0gRHVuZ2VvbkdlbmVyYXRvci5nZW5lcmF0ZSggTUFYX1gsIE1BWF9ZIClcbiAgICAvLyBsZXQgc3RhZ2UgPSBNYXplR2VuZXJhdG9yLmdlbmVyYXRlKCBNQVhfWCwgTUFYX1kgKVxuXG4gICAgY29uc3QgcmVuZGVyID0gbmV3IFJlbmRlcmVyKCBkaXNwbGF5IClcblxuICAgIC8vIGxldCBzdGFnZTogU3RhZ2UgPSBEcmF3bkdlbmVyYXRvci5nZW5lcmF0ZShcbiAgICAvLyAgIE1BWF9YLFxuICAgIC8vICAgTUFYX1ksXG4gICAgLy8gICBbXG4gICAgLy8gICAgIFwiIyMjIyMjIyNcIixcbiAgICAvLyAgICAgXCIjLi4uLi4uIyAgICAgICAgICMjIyMjIyMjI1wiLFxuICAgIC8vICAgICBcIiMuLi4uLi4jIyMjIyMjIyMjIy4uLi4uLi4jXCIsXG4gICAgLy8gICAgIFwiIy4uLi4uLicuLi4uLi4uLi4nLi4uLi4uLiNcIixcbiAgICAvLyAgICAgXCIjLi4uLi4uIyMjIyMnIyMjIyMuLi4uLi4uI1wiLFxuICAgIC8vICAgICBcIiMjIyMgIyMjICAgIy4jICAgIyMjJyMjIyMjXCIsXG4gICAgLy8gICAgIFwiICMuLi4uIyAgICAjLiMjIyMjLi4uLi4jXCIsXG4gICAgLy8gICAgIFwiICMuLi4uIyAgICAjLi4uLi4gLi4uLi4jXCIsXG4gICAgLy8gICAgIFwiICMuLi4uIyAgICAjIyMjIyMjLi4uLi4jXCIsXG4gICAgLy8gICAgIFwiICMjIyMjIyAgICAgICAgICAjIyMjIyMjXCJcbiAgICAvLyAgIF1cbiAgICAvLyApXG5cbiAgICBjb25zdCBmcmVlU3BvdCA9IGZ1bmN0aW9uKCBzdGFnZTogU3RhZ2UgKTogWyBudW1iZXIsIG51bWJlciBdIHtcbiAgICAgIGZvciAoIGxldCBpID0gMDsgaSA8IHN0YWdlLmZpZWxkLmxlbmd0aDsgaSsrICkge1xuICAgICAgICBmb3IgKCBsZXQgaiA9IDA7IGogPCBzdGFnZS5maWVsZFsgaSBdLmxlbmd0aDsgaisrICkge1xuICAgICAgICAgIGlmICggIXN0YWdlLmZpZWxkWyBpIF1bIGogXS50YW5naWJsZSgpICkge1xuICAgICAgICAgICAgcmV0dXJuIFsgaSwgaiBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZnJlZVNwb3QyID0gZnVuY3Rpb24oIHN0YWdlOiBTdGFnZSApOiBbIG51bWJlciwgbnVtYmVyIF0ge1xuICAgICAgZm9yICggbGV0IGkgPSBzdGFnZS5maWVsZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSApIHtcbiAgICAgICAgZm9yICggbGV0IGogPSBzdGFnZS5maWVsZFsgaSBdLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tICkge1xuICAgICAgICAgIGlmICggIXN0YWdlLmZpZWxkWyBpIF1bIGogXS50YW5naWJsZSgpICkge1xuICAgICAgICAgICAgcmV0dXJuIFsgaSwgaiBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IFsgeCwgeSBdID0gZnJlZVNwb3QoIHN0YWdlICksXG4gICAgICAgIFsgeDIsIHkyIF0gPSBmcmVlU3BvdDIoIHN0YWdlIClcblxuICAgIGxldCB3YWxrZXIgPSBuZXcgV2Fsa2VyKCB4LCB5IClcbiAgICBsZXQgd2Fsa2VyMiA9IG5ldyBXYWxrZXIoIHgyLCB5MiApXG5cbiAgICBzZXRJbnRlcnZhbCggKCkgPT4ge1xuICAgICAgLy8gZGlzcGxheS5jbGVhcigpXG4gICAgICByZW5kZXIucmVuZGVyU3RhZ2UoIHN0YWdlLCB3YWxrZXIgKVxuICAgICAgcmVuZGVyLnJlbmRlclN0YWdlKCBzdGFnZSwgd2Fsa2VyMiApXG5cbiAgICAgIHJlbmRlci5yZW5kZXJUaWxlKCAgd2Fsa2VyLngsIHdhbGtlci55LCB3YWxrZXIudGlsZS5wcmludFRpbGUoKSApXG4gICAgICByZW5kZXIucmVuZGVyVGlsZSggIHdhbGtlcjIueCwgd2Fsa2VyMi55LCB3YWxrZXIyLnRpbGUucHJpbnRUaWxlKCkgKVxuICAgICAgd2Fsa2VyLmFjdCggc3RhZ2UgKVxuICAgICAgd2Fsa2VyMi5hY3QoIHN0YWdlIClcblxuICAgIH0sIDEwMCApXG4gIH1cbn0pXG4iXX0=
