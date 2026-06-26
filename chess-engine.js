/**
 * 中国象棋游戏逻辑
 * chess-engine.js
 */

// ===========================
// 棋子常量
// ===========================
const PIECES = {
  // 红方 (值为正数)
  RJ: 1,  // 将/帅
  RS: 2,  // 仕/士
  RX: 3,  // 相/象
  RM: 4,  // 馬
  RC: 5,  // 車
  RP: 6,  // 炮
  RZ: 7,  // 兵/卒

  // 黑方 (值为负数)
  BJ: -1, BS: -2, BX: -3, BM: -4, BC: -5, BP: -6, BZ: -7,

  EMPTY: 0
};

const PIECE_NAMES = {
  [PIECES.RJ]: '帅', [PIECES.RS]: '仕', [PIECES.RX]: '相',
  [PIECES.RM]: '马', [PIECES.RC]: '车', [PIECES.RP]: '炮', [PIECES.RZ]: '兵',
  [PIECES.BJ]: '将', [PIECES.BS]: '士', [PIECES.BX]: '象',
  [PIECES.BM]: '马', [PIECES.BC]: '车', [PIECES.BP]: '炮', [PIECES.BZ]: '卒',
};

const COL_NAMES = ['一','二','三','四','五','六','七','八','九'];

// ===========================
// 初始棋盘布局 (10行9列)
// 第0行 = 黑方底线, 第9行 = 红方底线
// ===========================
function createInitialBoard() {
  const B = PIECES;
  return [
    // 行0: 黑方底线
    [B.BC, B.BM, B.BX, B.BS, B.BJ, B.BS, B.BX, B.BM, B.BC],
    // 行1
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    // 行2: 黑炮
    [0, B.BP, 0, 0, 0, 0, 0, B.BP, 0],
    // 行3: 黑卒
    [B.BZ, 0, B.BZ, 0, B.BZ, 0, B.BZ, 0, B.BZ],
    // 行4: 空
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    // 行5: 空
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    // 行6: 红兵
    [B.RZ, 0, B.RZ, 0, B.RZ, 0, B.RZ, 0, B.RZ],
    // 行7: 红炮
    [0, B.RP, 0, 0, 0, 0, 0, B.RP, 0],
    // 行8
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    // 行9: 红方底线
    [B.RC, B.RM, B.RX, B.RS, B.RJ, B.RS, B.RX, B.RM, B.RC],
  ];
}

// ===========================
// 工具函数
// ===========================
function isRed(p)   { return p > 0; }
function isBlack(p) { return p < 0; }
function isEmpty(p) { return p === 0; }
function isSameColor(a, b) {
  return (a > 0 && b > 0) || (a < 0 && b < 0);
}
function inBoard(r, c) {
  return r >= 0 && r <= 9 && c >= 0 && c <= 8;
}

// 克隆棋盘
function cloneBoard(board) {
  return board.map(row => [...row]);
}

// ===========================
// 合法走法生成
// ===========================
function getValidMoves(board, row, col) {
  const piece = board[row][col];
  if (piece === 0) return [];

  const moves = [];
  const abs = Math.abs(piece);

  switch (abs) {
    case 1: getJiangMoves(board, row, col, moves); break;
    case 2: getShiMoves(board, row, col, moves);   break;
    case 3: getXiangMoves(board, row, col, moves); break;
    case 4: getMaMoves(board, row, col, moves);    break;
    case 5: getCheMoves(board, row, col, moves);   break;
    case 6: getPaoMoves(board, row, col, moves);   break;
    case 7: getBingMoves(board, row, col, moves);  break;
  }

  // 过滤掉走完后自己将帅被将军的步
  return moves.filter(([tr, tc]) => !wouldBeCheck(board, row, col, tr, tc));
}

// 帅/将 - 九宫格内走一步
function getJiangMoves(board, r, c, moves) {
  const piece = board[r][c];
  const red = isRed(piece);
  // 九宫列范围: 3-5; 红方行:7-9, 黑方行:0-2
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (!inBoard(nr,nc)) continue;
    if (nc < 3 || nc > 5) continue;
    if (red  && (nr < 7 || nr > 9)) continue;
    if (!red && (nr < 0 || nr > 2)) continue;
    if (!isSameColor(piece, board[nr][nc])) moves.push([nr, nc]);
  }
  // 帅将对面规则 (飞将): 两将不能在同列无阻隔
  // 此处不实现飞将走法，通过wouldBeCheck在过滤层处理
}

// 仕/士 - 九宫格内斜走一步
function getShiMoves(board, r, c, moves) {
  const piece = board[r][c];
  const red = isRed(piece);
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr,dc] of dirs) {
    const nr=r+dr, nc=c+dc;
    if (!inBoard(nr,nc)) continue;
    if (nc < 3 || nc > 5) continue;
    if (red  && (nr < 7 || nr > 9)) continue;
    if (!red && (nr < 0 || nr > 2)) continue;
    if (!isSameColor(piece, board[nr][nc])) moves.push([nr, nc]);
  }
}

// 相/象 - 走田字，不能过河，象脚不能有棋子
function getXiangMoves(board, r, c, moves) {
  const piece = board[r][c];
  const red = isRed(piece);
  const dirs = [[-2,-2],[-2,2],[2,-2],[2,2]];
  for (const [dr,dc] of dirs) {
    const nr=r+dr, nc=c+dc;
    if (!inBoard(nr,nc)) continue;
    if (red  && nr < 5) continue; // 红方不过河(行>=5)
    if (!red && nr > 4) continue; // 黑方不过河(行<=4)
    // 象脚
    const legR = r + dr/2, legC = c + dc/2;
    if (board[legR][legC] !== 0) continue;
    if (!isSameColor(piece, board[nr][nc])) moves.push([nr, nc]);
  }
}

// 馬 - 走日，马脚不能有棋子
function getMaMoves(board, r, c, moves) {
  const piece = board[r][c];
  const dirs = [
    [-2,-1,[-1,0]], [-2,1,[-1,0]],
    [2,-1,[1,0]],   [2,1,[1,0]],
    [-1,-2,[0,-1]], [1,-2,[0,-1]],
    [-1,2,[0,1]],   [1,2,[0,1]],
  ];
  for (const [dr,dc,leg] of dirs) {
    const nr=r+dr, nc=c+dc;
    if (!inBoard(nr,nc)) continue;
    const lr=r+leg[0], lc=c+leg[1];
    if (board[lr][lc] !== 0) continue;
    if (!isSameColor(piece, board[nr][nc])) moves.push([nr, nc]);
  }
}

// 車 - 横竖任意格，中间不能有棋子
function getCheMoves(board, r, c, moves) {
  const piece = board[r][c];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr,dc] of dirs) {
    let nr=r+dr, nc=c+dc;
    while (inBoard(nr,nc)) {
      if (board[nr][nc] !== 0) {
        if (!isSameColor(piece, board[nr][nc])) moves.push([nr,nc]);
        break;
      }
      moves.push([nr,nc]);
      nr+=dr; nc+=dc;
    }
  }
}

// 炮 - 直走，吃子时需隔一子
function getPaoMoves(board, r, c, moves) {
  const piece = board[r][c];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr,dc] of dirs) {
    let nr=r+dr, nc=c+dc;
    let platform = false;
    while (inBoard(nr,nc)) {
      if (!platform) {
        if (board[nr][nc] === 0) { moves.push([nr,nc]); }
        else { platform = true; }
      } else {
        if (board[nr][nc] !== 0) {
          if (!isSameColor(piece, board[nr][nc])) moves.push([nr,nc]);
          break;
        }
      }
      nr+=dr; nc+=dc;
    }
  }
}

// 兵/卒 - 过河前只能向前，过河后可左右
function getBingMoves(board, r, c, moves) {
  const piece = board[r][c];
  const red = isRed(piece);
  const forward = red ? -1 : 1; // 红方向上(row减小)，黑方向下
  const crossed = red ? (r <= 4) : (r >= 5); // 是否过河

  // 向前
  const nr=r+forward, nc=c;
  if (inBoard(nr,nc) && !isSameColor(piece, board[nr][nc])) moves.push([nr,nc]);

  // 过河后可左右
  if (crossed) {
    for (const dc of [-1,1]) {
      if (inBoard(r,c+dc) && !isSameColor(piece, board[r][c+dc])) moves.push([r,c+dc]);
    }
  }
}

// ===========================
// 判断某方是否被将军
// ===========================
function isInCheck(board, redTurn) {
  // 找到帅/将的位置
  const kingPiece = redTurn ? PIECES.RJ : PIECES.BJ;
  let kr=-1, kc=-1;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    if (board[r][c] === kingPiece) { kr=r; kc=c; break; }
  }
  if (kr === -1) return true; // 将/帅被吃掉

  // 飞将检查：两将在同列，中间无子
  const enemyKing = redTurn ? PIECES.BJ : PIECES.RJ;
  for (let r=0;r<10;r++) {
    if (board[r][kc] === enemyKing) {
      let blocked = false;
      const minR = Math.min(r,kr), maxR = Math.max(r,kr);
      for (let tr=minR+1;tr<maxR;tr++) {
        if (board[tr][kc] !== 0) { blocked=true; break; }
      }
      if (!blocked) return true;
    }
  }

  // 检查对方所有棋子能否攻击到将/帅
  for (let r=0;r<10;r++) {
    for (let c=0;c<9;c++) {
      const p = board[r][c];
      if (p === 0) continue;
      if (redTurn && p > 0) continue;  // 跳过己方
      if (!redTurn && p < 0) continue;
      // 获取该棋子走法（不过滤将军）
      const rawMoves = getRawMoves(board, r, c);
      if (rawMoves.some(([tr,tc]) => tr===kr && tc===kc)) return true;
    }
  }
  return false;
}

// 不过滤将军的走法（用于判断攻击范围）
function getRawMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const abs = Math.abs(piece);
  switch(abs) {
    case 1: getJiangMoves(board,r,c,moves); break;
    case 2: getShiMoves(board,r,c,moves);   break;
    case 3: getXiangMoves(board,r,c,moves); break;
    case 4: getMaMoves(board,r,c,moves);    break;
    case 5: getCheMoves(board,r,c,moves);   break;
    case 6: getPaoMoves(board,r,c,moves);   break;
    case 7: getBingMoves(board,r,c,moves);  break;
  }
  return moves;
}

// 走棋后是否被将军
function wouldBeCheck(board, fromR, fromC, toR, toC) {
  const nb = cloneBoard(board);
  const piece = nb[fromR][fromC];
  nb[toR][toC] = piece;
  nb[fromR][fromC] = 0;
  return isInCheck(nb, isRed(piece));
}

// 判断是否将死/困毙
function isCheckmate(board, redTurn) {
  for (let r=0;r<10;r++) {
    for (let c=0;c<9;c++) {
      const p = board[r][c];
      if (p === 0) continue;
      if (redTurn && !isRed(p)) continue;
      if (!redTurn && isRed(p)) continue;
      if (getValidMoves(board, r, c).length > 0) return false;
    }
  }
  return true;
}

// ===========================
// 简单 AI (随机/贪心)
// ===========================
const PIECE_VALUES = {
  1: 10000, 2: 20, 3: 20, 4: 40, 5: 90, 6: 45, 7: 10
};

function evaluateBoard(board) {
  let score = 0;
  for (let r=0;r<10;r++) {
    for (let c=0;c<9;c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[Math.abs(p)] || 0;
      score += isRed(p) ? -val : val; // AI执黑，黑方正分
    }
  }
  return score;
}

function aiMove(board) {
  let bestScore = -Infinity;
  let bestMove = null;
  const shuffled = [];

  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p = board[r][c];
    if (p >= 0) continue; // 只走黑方
    const moves = getValidMoves(board, r, c);
    for (const [tr,tc] of moves) shuffled.push([r,c,tr,tc]);
  }

  // 打乱顺序增加随机性
  for (let i=shuffled.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const [r,c,tr,tc] of shuffled) {
    const nb = cloneBoard(board);
    nb[tr][tc] = nb[r][c];
    nb[r][c] = 0;
    const score = evaluateBoard(nb);
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r,c,tr,tc];
    }
  }
  return bestMove;
}

// 导出（供chess-game.html使用）
window.ChessEngine = {
  createInitialBoard,
  getValidMoves,
  isInCheck,
  isCheckmate,
  aiMove,
  cloneBoard,
  PIECES,
  PIECE_NAMES,
  COL_NAMES,
  isRed,
  isBlack,
};
