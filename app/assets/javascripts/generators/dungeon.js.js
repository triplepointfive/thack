"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
require("../utils.js.ts");
var THICKNESS = 0;
var Room = (function (_super) {
    __extends(Room, _super);
    function Room() {
        _super.apply(this, arguments);
    }
    Room.prototype.notCross = function (rect) {
        return (rect.x - THICKNESS > this.x + this.w) ||
            (rect.y - THICKNESS > this.y + this.h) ||
            (rect.x + rect.w < this.x - THICKNESS) ||
            (rect.y + rect.h < this.y - THICKNESS);
    };
    Room.prototype.pointWithin = function () {
        return [this.x + 1 + rand(this.w - 1), this.y + 1 + rand(this.h - 1)];
    };
    return Room;
}(Rect));
