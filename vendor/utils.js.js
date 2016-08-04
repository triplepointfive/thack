var MAX_X = 100;
var MAX_Y = 100;
Array.prototype.max = function () {
    return Math.max.apply(Math, this);
};
Array.prototype.min = function () {
    return Math.min.apply(Math, this);
};
var succ = function (c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
};
var rand = function (max) {
    return Math.floor(Math.random() * max);
};
var twoDimArray = function (dimX, dimY, value) {
    var field = Array(dimX);
    var i = 0;
    while (i < dimX) {
        field[i] = new Array(dimY);
        var j = 0;
        while (j < dimY) {
            field[i][j] = value(i, j);
            j++;
        }
        i++;
    }
    return field;
};
var Rect = (function () {
    function Rect(x, y, w, h) {
        // TODO: Validate?
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    Rect.prototype.move = function (x, y) {
        this.x += x;
        this.y += y;
    };
    return Rect;
}());
