'use strict'

const CONNR = 1<<0, CONND = 1<<1, CONNL = 1<<2, CONNU = 1<<3, MASKCONN = (1<<4) - 1, CONNARR = [CONNR, CONND, CONNL, CONNU]
const CELLTETRO = 0, CELLPUYO = 1, CELLMARIO = 2, CELLSPF = 3, CELLCOLUMNS = 4
const PIECETETRO = 0, PIECEPUYO = 1, PIECEMARIO = 2, PIECESPF = 3, PIECECOLUMNS = 4
const WAITNO = 0, WAITARE = 1, WAITERASE = 2, WAITFALL = 3, WAITFREEFALL = 4

class Cell{
  constructor(ctx, type, color, conn){
    this.ctx = ctx
    this.type = type
    this.color = color
    this.conn = conn
    this.del = false
    this.visit = false
  }
  draw(){
    let ctx = this.ctx
    let color = this.color
    ctx.fillStyle = ['#888','#F00','#F80','#FF0','#0F0','#0FF','#00F','#F0F'][color]
    if(this.type === CELLTETRO){
      ctx.fillRect(0, 0, 1, 1)
      let conn = this.conn
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      if(!(this.conn & CONNR)){
        ctx.fillRect(0.9, 0, 0.1, 1)
      }
      if(!(this.conn & CONND)){
        ctx.fillRect(0, 0.9, 1, 0.1)
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      if(!(this.conn & CONNL)){
        ctx.fillRect(0, 0, 0.1, 1)
      }
      if(!(this.conn & CONNU)){
        ctx.fillRect(0, 0, 1, 0.1)
      }
      if(this.del === true){
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fillRect(0, 0, 1, 1)
      }
    }else if(this.type === CELLPUYO){
      ctx.beginPath()
      ctx.arc(0.5, 0.5, 0.45, 0, Math.PI * 2, false)
      ctx.fill()
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
      ctx.lineWidth = 0.1
      ctx.stroke()
      if(this.del === true){
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.beginPath()
        ctx.arc(0.5, 0.5, 0.5, 0, Math.PI * 2, false)
        ctx.fill()
      }
    }
  }
}

class ActiveCell{
  constructor(ctx, cell, ox, oy){
    this.ctx = ctx
    this.cell = cell
    this.ox = ox
    this.oy = oy
  }
  draw(){
    let ctx = this.ctx
    ctx.save()
    ctx.translate(this.ox, this.oy)
    this.cell.draw()
    ctx.restore()
  }
}

const cellOOB = new Cell(null, -1, -1, 0)

class Stack {
  constructor(ctx, w, h) {
    this.ctx = ctx
    this.w = w
    this.h = h
    this.cells = [] // of [Cell]
    for(let i = 0; i < h; i++){
      this.cells.push([])
      for(let j = 0; j < w; j++){
        this.cells[i].push(null)
      }
    }
    
  }

  getCell(x, y){
    if(x < 0 || x >= this.w || y >= this.h){
      return cellOOB
    }
    if(y < 0){
      return null
    }
    return this.cells[y][x]
  }

  maskEraseTetro(){
    let hasErase = false
    for(let y = 0; y < this.h; y++){
      let curl = 0, xst = -1
      for(let x = 0; x <= this.w; x++){
        if(x !== this.w && this.cells[y][x] !== null && this.cells[y][x].type === CELLTETRO){
          if(curl === 0){
            curl = 1
            xst = x
          }else{
            curl++
          }
        }else{
          if(curl >= 10){
            for(let ix = xst; ix < xst + curl; ix++){
              this.cells[y][ix].del = true
            }
            hasErase = true
          }
          curl = 0
        }
      }
    }
    return hasErase
  }

  maskErasePuyo(){
    let hasErase = false
    let getCell = this.getCell.bind(this)    
    let groupC = 0
    let domark = false
    let rec = (x, y, color) => {
      let cell = getCell(x, y)
      if(cell !== null && cell !== cellOOB){
        if(
          (!domark && cell.visit === true) ||
          (domark && cell.del === true) ||
          cell.type !== CELLPUYO
        ){
          return
        }
        if(color === null){
          color = cell.color
        }else if(cell.color !== color){
          return
        }
        cell.visit = true
        if(!domark){
          groupC++
        }else{
          cell.del = true
        }
        rec(x + 1, y, color)
        rec(x, y + 1, color)
        rec(x - 1, y, color)
        rec(x, y - 1, color)
      }
    }
    for(let y = 0; y < this.h; y++){
      for(let x = 0; x < this.w; x++){
        domark = false
        groupC = 0
        rec(x, y, null)
        if(groupC >= 4){
          domark = true
          rec(x, y, null)
          hasErase = true
        }
      }
    }
    for(let y = 0; y < this.h; y++){
      for(let x = 0; x < this.w; x++){
        if(this.cells[y][x] !== null){
          this.cells[y][x].visit = false
        }
      }
    }
    return hasErase
  }

  erase(){
    let dx = [1, 0, -1, 0]
    let dy = [0, 1, 0, -1]
    let count = 0
    for(let y = 0; y < this.h; y++){
      for(let x = 0; x < this.w; x++){
        let c = this.cells[y][x]
        if(c !== null && c.del === true){
          for(let d = 0; d < 4; d++){
            if(c.conn & CONNARR[d]){
              let cadj = this.getCell(x + dx[d], y + dy[d])
              let revconn = CONNARR[(d + 2) % 4]
              if(cadj === cellOOB || cadj === null || !(cadj.conn & revconn)){
                throw "broken connection"
              }
              cadj.conn &= ~revconn // clear bit of the reversed direction
            }
          }
          this.cells[y][x] = null
          count++
        }
      }
    }
    return count
  }

  freeFall(dofall = true){
    let getCell = this.getCell.bind(this)
    let rec = (x, y) => {
      let c = getCell(x, y)
      if(c !== null && c!== cellOOB){
        if(c.visit === true){
          return
        }
        c.visit = true
        if(c.conn & CONNR){
          rec(x + 1, y)
        }
        if(c.conn & CONND){
          rec(x, y + 1)
        }
        if(c.conn & CONNL){
          rec(x - 1, y)
        }
        rec(x, y - 1) // shortcut lol
      }
      
    }
    for(let x = 0; x < this.w; x++){
      rec(x, this.h - 1)
    }
    let cells = this.cells
    let hasFall = false
    for(let y = this.h - 1; y > 0; y--){
      for(let x = 0; x < this.w; x++){
        if(cells[y - 1][x] !== null && cells[y - 1][x].visit === false){
          if(dofall){
            if(cells[y][x] !== null){
              throw "Assertion failed: supported blocks wrong"
            }
            this.cells[y][x] = this.cells[y - 1][x]
            this.cells[y - 1][x] = null
          }
          hasFall = true
        }
      }
    }
    for(let y = this.h - 1; y > 0; y--){
      for(let x = 0; x < this.w; x++){
        if(cells[y][x] !== null){
          cells[y][x].visit = false
        }
      }
    }
    return hasFall
  }

  draw() {
    let ctx = this.ctx
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, this.w, this.h)
    for(let i = 0; i < this.h; i++){
      for(let j = 0; j < this.w; j++){
        let cell = this.getCell(j, i)
        if(cell !== null){
          ctx.save()
          ctx.translate(j, i)
          cell.draw()
          ctx.restore()
        }
      }
    }
  }
}

class DAS {
  constructor(nFirst, nRepeat){
    this.nFirst = nFirst
    this.nRepeat = nRepeat
    this.counter = null
    this.dire = 0
    this.state = 0
  }
  stepState(cmds){
    let output = 0
    if(cmds.left == 1){
      this.dire = -1
      this.state = 1
      this.counter = 0
      output = this.dire
    }else if(cmds.right == 1){
      this.dire = 1
      this.state = 1
      this.counter = 0
      output = this.dire
    }else if(
      ((cmds.left & 1) && this.dire == -1) ||
      ((cmds.right & 1) && this.dire == 1)
    ){
      this.counter++
      if(this.state == 1 && this.counter >= this.nFirst){
        output = this.dire
        this.state = 2
        this.counter = 0
      }else if(this.state==2 && this.counter >= this.nRepeat){
        output = this.dire
        this.counter = 0
      }
    }else if(
      ((cmds.left & 1) && this.dire == 1) ||
      ((cmds.right & 1) && this.dire == -1)
    ){
      this.dire = -this.dire
      this.state = 1
      this.counter = 0
      output = this.dire
    }else{
      this.dire = 0
      this.state = 0
      this.counter = null
    }
    return output
  }
}

class Piece {
  constructor(ctx, type, cellList, rcx, rcy){
    this.ctx = ctx
    this.type = type
    this.cellList = cellList // of ActiveCell
    this.rcx = rcx
    this.rcy = rcy
  }
  draw(){
    let cl = this.cellList
    let ctx = this.ctx
    for(let i = 0; i < cl.length; i++){
      cl[i].draw()
    }
  }
  rotated(dire){
    dire = (dire + 4) % 4
    let cl = this.cellList
    let newcl = []
    let rcx = this.rcx, rcy = this.rcy
    for(let i = 0; i < cl.length; i++){
      let c = cl[i].cell
      let conn = c.conn
      let newconn = ((conn << dire) | conn >>> (4 - dire)) & MASKCONN // << means rot CW
      let newc = new Cell(this.ctx, c.type, c.color, newconn)
      let rox = cl[i].ox - rcx, roy = cl[i].oy - rcy
      let newox = rox * [1, 0, -1, 0][dire] + roy * [0, -1, 0, 1][dire] + rcx
      let newoy = roy * [1, 0, -1, 0][dire] + rox * [0, 1, 0, -1][dire] + rcy
      if(newox !== ~~newox || newoy !== ~~newoy){
        throw "Assertion failed: integral coords after rotation"
      }
      let newac = new ActiveCell(this.ctx, newc, newox, newoy)
      newcl.push(newac)
    }
    let newp = new Piece(this.ctx, this.type, newcl, rcx, rcy)
    return newp
  }
  static createTetro(ctx, shape){
    let CT = CELLTETRO
    let PT = PIECETETRO
    let color = [5, 3, 7, 4, 1, 6, 2][shape]
    let newp = null
    const R = CONNR, D = CONND, L = CONNL, U = CONNU
    switch(shape){
      case 0: // I
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R), 0, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, R|L), 1, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, R|L), 2, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L), 3, 1), 
      ], 1.5, 1.5)
      break
      case 1: // O
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R|D), 1, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|D), 2, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|U), 2, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, R|U), 1, 1), 
      ], 1.5, 0.5)
      break
      case 2: // T
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R), 0, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, D), 1, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L), 2, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|U|R), 1, 1), 
      ], 1, 1)
      break
      case 3: // S
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R), 0, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|U), 1, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, D|R), 1, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L), 2, 0), 
      ], 1, 1)
      break
      case 4: // Z
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R), 0, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|D), 1, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, U|R), 1, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L), 2, 1), 
      ], 1, 1)
      break
      case 5: // J
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, D), 0, 0),
        new ActiveCell(ctx, new Cell(ctx, CT, color, U|R), 0, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|R), 1, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L), 2, 1), 
      ], 1, 1)
      break
      case 6: // L
      newp = new Piece(ctx, PT,[
        new ActiveCell(ctx, new Cell(ctx, CT, color, R), 0, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|R), 1, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, L|U), 2, 1),
        new ActiveCell(ctx, new Cell(ctx, CT, color, D), 2, 0), 
      ], 1, 1)
      break
      default:
      throw "shit"
    }
    return newp
  }

  static createPuyo(ctx, shape, colors){
    let CT = CELLPUYO
    let PT = PIECEPUYO
    let newp = null
    for( let i = 0; i < colors.length; i++){
      colors[i] = [1, 3, 6, 4][colors[i]]
    }
    newp = new Piece(ctx, PT, [
      new ActiveCell(ctx, new Cell(ctx, CT, colors[0], 0), 0, 0),
      new ActiveCell(ctx, new Cell(ctx, CT, colors[1], 0), 0, 1),
    ], 0, 1)
    return newp
  }
}



class ActivePiece {
  constructor(ctx, piece, x, y, r){
    this.ctx = ctx
    this.piece = piece
    this.x = x
    this.y = y
    this.r = r
  }

  draw() {
    let ctx = this.ctx
    ctx.save()
    ctx.translate(this.x, this.y)
    this.piece.draw()
    ctx.restore()
  }
}

class Player {
  constructor(ctx, stack) {
    this.ctx = ctx
    this.stack = stack

    this.actPiece = null
    this.das = new DAS(9, 1)
    this.fallC = 0
    this.fallL = 60
    this.lockC = 0
    this.lockL = 60

    this.stats = {
      score: 0
    }

    this.dead = false
  }

  newActPiece() {
    let irand = (n) => ~~(Math.random() * n)
    let aptype = irand(2)
    let newp, newap
    switch(aptype){
      case PIECETETRO:
        newp = Piece.createTetro(this.ctx, irand(7))
        newap = new ActivePiece(this.ctx, newp, 3, 0, 0)
      break
      case PIECEPUYO:
        newp = Piece.createPuyo(this.ctx, irand(3), [irand(4), irand(4)])
        newap = new ActivePiece(this.ctx, newp, 10 + 2, 0, 0)
      break
      default:
      throw "shit"
    }
    if(this.collision(newap)){
      this.dead = true
    }
    this.actPiece = newap
  }

  updateSpeed(){
    this.fallL = ~~(60 / (1 + (this.stats.score / 10 / 10)))
  }

  draw() {
    let ctx = this.ctx
    let ap = this.actPiece
    if(ap !== null){
      ap.draw()
    }
  }

  collision(ap){
    let cl = ap.piece.cellList
    for(let i = 0; i < cl.length; i++){
      let c = this.stack.getCell(ap.x + cl[i].ox, ap.y + cl[i].oy)
      if(c !== null){
        return true
      }
    }
    return false
  }

  lock(){
    let ap = this.actPiece
    let p = ap.piece
    let px = ap.x
    let py = ap.y
    let cl = p.cellList
    let stk = this.stack
    for(let i = 0; i < cl.length; i++){
      stk.cells[py + cl[i].oy][px + cl[i].ox] = cl[i].cell
    }
    this.actPiece = null
  }

  stepState(cmds) {
    if(this.dead){
      return
    }
    let lr = this.das.stepState(cmds)

    if(this.actPiece === null){
      //discard lr
    }else{

      for(let dire = 0; dire < 2; dire++){
        if((dire === 0 && cmds.cw === 1) || (dire === 1 && cmds.ccw === 1)){
          let newp = this.actPiece.piece.rotated([1, -1][dire])
          let newap = new ActivePiece(this.ctx, newp, this.actPiece.x, this.actPiece.y)
          if(!this.collision(newap)){
            this.actPiece = newap
          }
        }
      }

      this.actPiece.x += lr
      if(this.collision(this.actPiece)){
        this.actPiece.x -= lr
      }

      if(cmds.down & 1){
        this.actPiece.y += 1
        if(this.collision(this.actPiece)){
          this.actPiece.y -= 1
        }else{
          this.lockC = 0
          this.fallC = 0
        }
      }

      if(cmds.up === 1){
        while(true){
          this.actPiece.y += 1
          if(this.collision(this.actPiece)){
            this.actPiece.y -= 1
            break
          }
        }
        this.lockC = this.lockL
      }

      this.actPiece.y += 1
      if(this.collision(this.actPiece)){
        this.lockC++
        this.actPiece.y -= 1
        if(this.lockC >= this.lockL){
          this.lock()
          console.log(this.lockC)
        }
      }else{
        this.fallC++
        if(this.fallC >= this.fallL){
          this.fallC = 0
          this.lockC = 0
        }else{
          this.actPiece.y -= 1
        }
      }
      
    }
  }
}


class Game {
  constructor(ctx, w, h, gfx) {
    this.ctx = ctx
    this.w = w
    this.h = h

    this.stack = new Stack(ctx, w, h)

    this.players = [new Player(ctx, this.stack)]

    let csw = ~~((gfx.width - 64) / w)
    let csh = ~~((gfx.height - 64) / h)
    let cs = Math.min(csw, csh)
    this.gfx_cs = cs
    this.gfx_x = ~~((gfx.width - cs * w) / 2)
    this.gfx_y = ~~((gfx.height - cs * h) / 2)
    
    this.boundFn = {}
    this.boundFn.tick = this.tick.bind(this)
    
    this.states = {
      downKeys: new Set(),
      cmds: {
        up: 0,
        down: 0,
        left: 0,
        right: 0,
        cw: 0,
        ccw: 0,
        hold: 0
      },
      keyStates: {
        up: false,
        down: false,
        left: false,
        right: false,
        cw: false,
        ccw: false,
        hold: false
      },
    }

    this.waitState = WAITARE
    this.waitC = 0
    this.waitL = 100

    //this.players[0].newActPiece()
  }

  draw() {
    let ctx = this.ctx
    ctx.save()
    ctx.translate(this.gfx_x, this.gfx_y)
    ctx.scale(this.gfx_cs, this.gfx_cs)
    this.stack.draw()
    for(let i = 0; i < this.players.length; i++){
      this.players[i].draw()
    }
    ctx.restore()
  }

  updateKeys(keys){
    let states = this.states.keyStates
    states.up = keys.has('ArrowUp') || keys.has('w')
    states.down = keys.has('ArrowDown') || keys.has('s')
    states.left = keys.has('ArrowLeft') || keys.has('a')
    states.right = keys.has('ArrowRight') || keys.has('d')
    states.cw = keys.has('x') || keys.has('k')
    states.ccw = keys.has('z') || keys.has('j')
    states.hold = keys.has('c') || keys.has('l')
  }

  keyDown(key) {
    this.states.downKeys.add(key)
    this.updateKeys(this.states.downKeys)
    // console.log(this.states.downKeys)
  }

  keyUp(key) {
    this.states.downKeys.delete(key)
    this.updateKeys(this.states.downKeys)
    // console.log(this.states.downKeys)
  }

  stepState() {
    for(let i in this.states.cmds){
      this.states.cmds[i] = ((this.states.cmds[i]<<1) | (+this.states.keyStates[i])) & 3
    }
    let judgeFFE = () => {
      let hasFall = this.stack.freeFall(false)
      if(hasFall){
        this.waitState = WAITFREEFALL
        this.waitL = 2
        this.waitC = 0
      }else{
        let hasErase = false
        hasErase = hasErase || this.stack.maskEraseTetro()
        hasErase = hasErase || this.stack.maskErasePuyo()
        if(!hasErase){
          this.waitState = WAITARE
          this.waitL = 0
          this.waitC = 0
        }else{
          this.waitState = WAITERASE
          this.waitL = 10
          this.waitC = 0
        }
      }
    }
    let toFreeFall = false
    if(this.waitState === WAITNO){
      for(let i = 0; i < this.players.length; i++){
        let player = this.players[i]
        player.stepState(this.states.cmds)
        if(player.actPiece === null){
          toFreeFall = true
        }
      }
    }
    if(toFreeFall){
      judgeFFE()
    }
    if(this.waitState == WAITFREEFALL){
      if(this.waitC >= this.waitL){
        this.stack.freeFall(true)
        judgeFFE()
      }else{
        this.waitC++
      }
    }
    if(this.waitState === WAITERASE){
      if(this.waitC >= this.waitL){
        this.players[0].stats.score += this.stack.erase()
        this.waitState = WAITFALL
        this.waitL = 15
        this.waitC = 0
      }else{
        this.waitC++
      }
    }
    if(this.waitState == WAITFALL){
      if(this.waitC >= this.waitL){
        judgeFFE()
      }else{
        this.waitC++
      }
    }
    
    if(this.waitState == WAITARE){
      if(this.waitC >= this.waitL){
        for(let i = 0; i < this.players.length; i++){
          let player = this.players[i]
          if(player.actPiece === null){
            player.newActPiece()
            player.updateSpeed()
            this.waitState = WAITNO // bugbugbuglol
          }
        }
      }else{
        this.waitC++
      }
    }

    return true
  }

  tick() {
    if (this.states.needRedraw) {
      this.draw()
    }
    this.states.needRedraw = this.stepState()

    // requestAnimationFrame告诉浏览器下次重绘前执行this.boundFn.tick这个回调函数
    // 之所以要bind(this)是因为js里的function(){}里面的this是根据运行时变化的, 谁调用他谁就是this
    // 所以bind(this)使得this.boundFn.tick的this始终为Game实例
    window.requestAnimationFrame(this.boundFn.tick)
  }

  start() {
    this.tick()
  }
}


// 注册按键的监听函数, 这里以键盘为例, 同样可以监听鼠标事件如mousemove, 来实现基于鼠标的交互逻辑
// 回调函数的执行跟init()所在的"主线程"的执行可以理解为互不干扰的并行执行, 所以回调函数里面更改了game.states里面的东西
// init()函数运行到的game.stepState()函数也能看到. 回调函数由按键等事件触发, 跟具体代码逻辑无关, 可能在任何时间点发生回调
function bindKeys(game) {
  window.addEventListener('keydown', function(event) {
    game.keyDown(event.key)
  })
  window.addEventListener('keyup', function(event) {
    game.keyUp(event.key)
  })
}

let game

function init() {
  let $canvas = document.getElementsByTagName('canvas')[0]
  $canvas.width = window.innerWidth
  $canvas.height = window.innerHeight
  game = new Game(
    $canvas.getContext('2d'),
    16,
    20,
    {
      width: $canvas.width,
      height: $canvas.height
    }
  )
  bindKeys(game)
  game.start()
}


init()
