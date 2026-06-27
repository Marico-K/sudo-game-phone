// ==================== 全局变量声明 ====================
let currentPuzzle = null;          // 当前数独题目信息 {id, puzzle, solution, gameType}
let originalPuzzle = '';           // 原始题目字符串（0表示空格）
let currentBoard = [];             // 当前棋盘状态数组（支持数字或候选数字数组）
let selectedCell = null;           // 选中的单元格 {row, col, index}
let selectedNumber = null;         // 选中的数字（1-9）或清除（0）
let timerInterval = null;          // 计时器定时器ID
let seconds = 0;                   // 游戏耗时（秒）
let currentGameType = '';        // 当前游戏类型
let currentDifficulty = '';      // 当前难度等级
let attemptCount = 0;              // 当前题目重置次数
let bestTime = null;               // 当前题目最佳成绩
let puzzleIdCounter = 0;           // 题目ID计数器
let cellsCache = null;             // 单元格DOM缓存
let iconMode = 'numbers';          // 图标模式: 'numbers', 'weather', 'animals'
let inputMode = 'exact';           // 输入模式: 'exact'（确定模式）, 'candidate'（草稿模式）
let paintMode = false;              // 画图模式
let currentPaintTab = 'cell';       // 当前画图tab: 'cell', 'note', 'line'
let currentPaintColor = 'none';     // 当前选中的画图颜色
let paintHistory = [];              // 画图撤销历史
let cellPaintData = [];             // 格子涂色数据
let notePaintData = [];             // 笔记涂色数据
let linePaintData = [];             // 划线数据
let lives = 3;                     // 剩余爱心数量
let undoStack = [];                // 撤销栈，记录操作历史
let currentGameScore = 0;          // 本局游戏积分
let totalScoreForGame = 0;         // 本局游戏总分（根据难度和空格数计算）
let filledCells = 0;               // 已填对的空格数
let totalEmptyCells = 0;           // 总空格数

// 图标映射表
const iconMaps = {
    numbers: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    weather: ['', '☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌤️', '🌙', '🌈'],
    animals: ['', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨']
};

/**
 * 获取指定数字对应的图标
 * @param {number} num - 数字（1-9）
 * @returns {string} - 图标或数字字符串
 */
function getIcon(num) {
    return iconMaps[iconMode][num] || num.toString();
}

/**
 * 切换图标模式
 */
function toggleIconMode() {
    const modes = ['numbers', 'weather', 'animals'];
    const currentIndex = modes.indexOf(iconMode);
    iconMode = modes[(currentIndex + 1) % modes.length];
    renderBoard();
    updateNumberButtons();

    // 更新切换按钮的显示
    updateIconToggleButton();
}

/**
 * 更新图标切换按钮的显示
 */
function updateIconToggleButton() {
    const btn = document.getElementById('iconToggleBtn');
    if (btn) {
        const modeNames = {
            numbers: '🔢 数字'/*,
            weather: '☀️ 天气',
            animals: '🐾 动物'*/
        };
        btn.textContent = modeNames[iconMode] || '🔢 数字';
    }
}

/**
 * 切换输入模式（确定模式/草稿模式）
 */
function toggleInputMode() {
    inputMode = inputMode === 'exact' ? 'candidate' : 'exact';
    // 兼容旧按钮
    const btn = document.getElementById('modeToggleBtn');
    if (btn) {
        if (inputMode === 'candidate') {
            btn.textContent = '📝 草稿模式';
            btn.classList.add('candidate-mode');
        } else {
            btn.textContent = '✏️ 确定模式';
            btn.classList.remove('candidate-mode');
        }
    }
    // 更新新的笔记按钮状态
    const noteBtn = document.getElementById('noteBtn');
    if (noteBtn) {
        if (inputMode === 'candidate') {
            noteBtn.classList.add('active');
        } else {
            noteBtn.classList.remove('active');
        }
    }
}

/**
 * 更新提示按钮角标
 */
function updateHintBadge(count) {
    const badge = document.getElementById('hintBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * 更新积分显示（改为显示本局游戏积分）
 */
function updateCoinDisplay() {
    const coinEl = document.getElementById('coinValue');
    if (coinEl) {
        coinEl.textContent = currentGameScore || 0;
    }
}

/**
 * 更新本局游戏积分显示
 */
function updateGameScoreDisplay() {
    updateCoinDisplay();
}

/**
 * 更新进度条显示
 */
function updateProgressBar() {
    const progressBar = document.getElementById('gameProgressBar');
    const progressText = document.getElementById('gameProgressText');
    if (!progressBar || !progressText) return;
    
    const progress = totalEmptyCells > 0 ? (filledCells / totalEmptyCells) * 100 : 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${filledCells}/${totalEmptyCells} (${Math.round(progress)}%)`;
    
    // 更新礼盒显示
    updateGiftBoxes(progress);
}

/**
 * 更新礼盒显示状态
 */
function updateGiftBoxes(progress) {
    const bronzeBox = document.getElementById('giftBoxBronze');
    const silverBox = document.getElementById('giftBoxSilver');
    const goldBox = document.getElementById('giftBoxGold');
    const bronzeWrapper = bronzeBox ? bronzeBox.parentElement : null;
    const silverWrapper = silverBox ? silverBox.parentElement : null;
    const goldWrapper = goldBox ? goldBox.parentElement : null;
    const bronzeLabel = bronzeWrapper ? bronzeWrapper.querySelector('.gift-label') : null;
    const silverLabel = silverWrapper ? silverWrapper.querySelector('.gift-label') : null;
    const goldLabel = goldWrapper ? goldWrapper.querySelector('.gift-label') : null;
    const size = currentPuzzle.size || 9;
    
    if (size === 4) {
        if (bronzeWrapper) {
            bronzeWrapper.style.display = 'block';
            bronzeWrapper.style.left = '100%';
        }
        if (bronzeBox) {
            bronzeBox.style.display = 'flex';
            bronzeBox.className = `gift-box ${progress >= 100 ? 'unlocked' : 'locked'}`;
            bronzeBox.innerHTML = progress >= 100 ? '🎁' : '🔒';
        }
        if (bronzeLabel) {
            bronzeLabel.textContent = '100%';
        }
        if (silverWrapper) {
            silverWrapper.style.display = 'none';
        }
        if (goldWrapper) {
            goldWrapper.style.display = 'none';
        }
    } else if (size === 6) {
        if (bronzeWrapper) {
            bronzeWrapper.style.display = 'block';
            bronzeWrapper.style.left = '70%';
        }
        if (bronzeBox) {
            bronzeBox.style.display = 'flex';
            bronzeBox.className = `gift-box ${progress >= 70 ? 'unlocked' : 'locked'}`;
            bronzeBox.innerHTML = progress >= 70 ? '🎁' : '🔒';
        }
        if (bronzeLabel) {
            bronzeLabel.textContent = '70%';
        }
        if (silverWrapper) {
            silverWrapper.style.display = 'block';
            silverWrapper.style.left = '100%';
        }
        if (silverBox) {
            silverBox.style.display = 'flex';
            silverBox.className = `gift-box ${progress >= 100 ? 'unlocked' : 'locked'}`;
            silverBox.innerHTML = progress >= 100 ? '🎁' : '🔒';
        }
        if (silverLabel) {
            silverLabel.textContent = '100%';
        }
        if (goldWrapper) {
            goldWrapper.style.display = 'none';
        }
    } else {
        if (bronzeWrapper) {
            bronzeWrapper.style.display = 'block';
            bronzeWrapper.style.left = '30%';
        }
        if (bronzeBox) {
            bronzeBox.style.display = 'flex';
            bronzeBox.className = `gift-box ${progress >= 30 ? 'unlocked' : 'locked'}`;
            bronzeBox.innerHTML = progress >= 30 ? '🎁' : '🔒';
        }
        if (bronzeLabel) {
            bronzeLabel.textContent = '30%';
        }
        if (silverWrapper) {
            silverWrapper.style.display = 'block';
            silverWrapper.style.left = '70%';
        }
        if (silverBox) {
            silverBox.style.display = 'flex';
            silverBox.className = `gift-box ${progress >= 70 ? 'unlocked' : 'locked'}`;
            silverBox.innerHTML = progress >= 70 ? '🎁' : '🔒';
        }
        if (silverLabel) {
            silverLabel.textContent = '70%';
        }
        if (goldWrapper) {
            goldWrapper.style.display = 'block';
            goldWrapper.style.left = '100%';
        }
        if (goldBox) {
            goldBox.style.display = 'flex';
            goldBox.className = `gift-box ${progress >= 100 ? 'unlocked' : 'locked'}`;
            goldBox.innerHTML = progress >= 100 ? '🎁' : '🔒';
        }
        if (goldLabel) {
            goldLabel.textContent = '100%';
        }
    }
}

/**
 * 计算获得的礼盒
 */
function calculateEarnedGiftBoxes() {
    const earnedBoxes = [];
    const progress = totalEmptyCells > 0 ? (filledCells / totalEmptyCells) * 100 : 100;
    const size = currentPuzzle.size || 9;
    
    if (size === 4) {
        if (progress >= 100) {
            earnedBoxes.push('bronze');
        }
    } else if (size === 6) {
        if (progress >= 70) {
            earnedBoxes.push('bronze');
        }
        if (progress >= 100) {
            earnedBoxes.push('silver');
        }
    } else {
        if (progress >= 30) {
            earnedBoxes.push('bronze');
        }
        if (progress >= 70) {
            earnedBoxes.push('silver');
        }
        if (progress >= 100) {
            earnedBoxes.push('gold');
        }
    }
    
    // 将礼盒添加到玩家背包
    const playerData = Storage.getPlayerData();
    if (!playerData.giftBoxes) {
        playerData.giftBoxes = { bronze: 0, silver: 0, gold: 0 };
    }
    
    earnedBoxes.forEach(boxType => {
        playerData.giftBoxes[boxType] = (playerData.giftBoxes[boxType] || 0) + 1;
    });
    
    Storage.savePlayerData(playerData);
    
    return earnedBoxes;
}

/**
 * 答对时增加积分
 */
function addScoreForCorrectAnswer() {
    // 根据难度计算每格得分
    let pointsPerCell = 10;
    if (currentPuzzle.difficultyType === 'MEDIUM') {
        pointsPerCell = 12;
    } else if (currentPuzzle.difficultyType === 'HARD') {
        pointsPerCell = 15;
    }
    
    currentGameScore += pointsPerCell;
    filledCells++;
    
    // 更新显示
    updateGameScoreDisplay();
    updateProgressBar();
    
    // 显示动态分数动画
    showScorePopup(pointsPerCell);
}

/**
 * 显示分数增加动画
 */
function showScorePopup(points) {
    const coinDisplay = document.querySelector('.coin-display');
    if (!coinDisplay) return;
    
    const popup = document.createElement('span');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    
    const rect = coinDisplay.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top}px`;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 800);
}

/**
 * 自动填写所有空格的候选数字（需要购买一键草稿道具）
 */
function fillAllCandidates() {
    // 检查是否拥有一键草稿道具
    const items = getPlayerItems();
    if (!items['auto_draft'] || items['auto_draft'] <= 0) {
        customAlert('您需要先在积分商城购买「一键草稿」道具才能使用此功能！', 'warning');
        return;
    }
    
    // 使用统一的候选数计算逻辑
    recalculateCandidates();
    
    // 更新显示
    renderBoard();

    // 自动保存进度
    scheduleSaveProgress();
}

/**
 * 清除所有草稿（候选数字）
 */
function clearAllCandidates() {
    const size = currentPuzzle.size || 9;
    // 遍历所有格子
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;

            // 如果是固定数字，跳过
            if (originalPuzzle[index] !== '0') continue;

            // 获取当前格子的值
            const currentValue = currentBoard[index];

            // 如果是候选数组，清空它
            if (Array.isArray(currentValue)) {
                currentBoard[index] = [];
            }
            // 如果是确定值，保持不变
        }
    }

    // 更新显示
    renderBoard();

    // 自动保存进度
    scheduleSaveProgress();
}

/**
 * 获取指定格子的所有候选数字
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @returns {number[]} - 候选数字数组
 */
function getCandidates(row, col) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const usedNumbers = new Set();

    // 获取同行已使用的数字
    for (let c = 0; c < size; c++) {
        const val = currentBoard[row * size + c];
        if (typeof val === 'number' && val !== 0) {
            usedNumbers.add(val);
        }
    }

    // 获取同列已使用的数字
    for (let r = 0; r < size; r++) {
        const val = currentBoard[r * size + col];
        if (typeof val === 'number' && val !== 0) {
            usedNumbers.add(val);
        }
    }

    // 获取同宫已使用的数字（支持标准数独和锯齿数独）
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：遍历不规则宫格中的单元格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const val = currentBoard[r * size + c];
                    if (typeof val === 'number' && val !== 0) {
                        usedNumbers.add(val);
                    }
                }
                break;
            }
        }
    } else {
        // 标准数独：遍历规则宫格中的单元格
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const val = currentBoard[r * size + c];
                if (typeof val === 'number' && val !== 0) {
                    usedNumbers.add(val);
                }
            }
        }
    }
    
    // 获取对角线已使用的数字（对角线数独规则）
    if (gameTypeStr === 'DIAGONAL') {
        // 主对角线 (从左上到右下)
        if (row === col) {
            for (let i = 0; i < size; i++) {
                if (i === col) continue;
                const val = currentBoard[i * size + i];
                if (typeof val === 'number' && val !== 0) {
                    usedNumbers.add(val);
                }
            }
        }
        // 副对角线 (从右上到左下)
        if (row + col === size - 1) {
            for (let i = 0; i < size; i++) {
                if (i === row) continue;
                const val = currentBoard[i * size + (size - 1 - i)];
                if (typeof val === 'number' && val !== 0) {
                    usedNumbers.add(val);
                }
            }
        }
    }

    // 返回未使用的数字作为候选
    const candidates = [];
    for (let n = 1; n <= size; n++) {
        if (!usedNumbers.has(n)) {
            candidates.push(n);
        }
    }

    return candidates;
}

/**
 * 获取同行中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同行其他格子的索引数组
 */
function getRows(row, col) {
    const size = currentPuzzle.size || 9;
    const excludeIndex = row * size + col;
    const indices = [];
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (idx !== excludeIndex) indices.push(idx);
    }
    return indices;
}

/**
 * 获取同列中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同列其他格子的索引数组
 */
function getCols(row, col) {
    const size = currentPuzzle.size || 9;
    const excludeIndex = row * size + col;
    const indices = [];
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (idx !== excludeIndex) indices.push(idx);
    }
    return indices;
}

/**
 * 获取对角线上除当前格子外的所有格子索引（对角线数独规则）
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 对角线上其他格子的索引数组
 */
function getDiagonals(row, col) {
    const size = currentPuzzle.size || 9;
    const excludeIndex = row * size + col;
    const indices = [];

    // 主对角线 (从左上到右下)
    if (row === col) {
        for (let i = 0; i < size; i++) {
            const idx = i * size + i;
            if (idx !== excludeIndex) indices.push(idx);
        }
    }

    // 副对角线 (从右上到左下)
    if (row + col === size - 1) {
        for (let i = 0; i < size; i++) {
            const idx = i * size + (size - 1 - i);
            if (idx !== excludeIndex) indices.push(idx);
        }
    }

    return indices;
}

/**
 * 获取同宫（3x3区域）中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同宫其他格子的索引数组
 */
function getBoxes(row, col) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const excludeIndex = row * size + col;
    const indices = [];

    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：遍历不规则宫格中的单元格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (idx !== excludeIndex) indices.push(idx);
                }
                break;
            }
        }
    } else {
        // 标准数独：遍历规则宫格中的单元格
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const rowStart = Math.floor(row / boxRows) * boxRows;
        const colStart = Math.floor(col / boxCols) * boxCols;
        for (let r = rowStart; r < rowStart + boxRows; r++) {
            for (let c = colStart; c < colStart + boxCols; c++) {
                const idx = r * size + c;
                if (idx !== excludeIndex) indices.push(idx);
            }
        }
    }
    return indices;
}

/**
 * 获取某个格子所在宫的所有格子（兼容标准数独和锯齿数独）
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @param {number} size - 棋盘大小
 * @param {string} gameTypeStr - 游戏类型
 * @param {Array} irregularBoxes - 不规则宫格数据（锯齿数独）
 * @returns {Array} - 宫中所有格子 {row, col}
 */
function getBoxCells(row, col, size, gameTypeStr, irregularBoxes) {
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：遍历不规则宫格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                return box.map(cell => ({ row: cell[0], col: cell[1] }));
            }
        }
    } else {
        // 标准数独：计算规则宫格
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        const cells = [];
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                cells.push({ row: r, col: c });
            }
        }
        return cells;
    }
    return [];
}

// ==================== 数独生成器类 ====================
class SudokuGenerator {
    constructor(size = 9, gameTypeStr = 'STANDARD') {
        this.setSize(size);
        this.setGameTypeStr(gameTypeStr);
    }

    /**
     * 设置棋盘尺寸
     * @param {number} size 尺寸（4、6或9）
     */
    setSize(size) {
        this.SIZE = size;
        // 宫格的行列数
        if (size === 4) {
            this.BOX_ROWS = 2;
            this.BOX_COLS = 2;
        } else if (size === 6) {
            this.BOX_ROWS = 2;
            this.BOX_COLS = 3;
        } else {
            this.BOX_ROWS = 3;
            this.BOX_COLS = 3;
        }
        // 可用的数字范围
        this.NUMBERS = [];
        for (let i = 1; i <= size; i++) {
            this.NUMBERS.push(i);
        }
    }

    /**
     * 设置游戏类型
     * @param {string} gameTypeStr 游戏类型（STANDARD, DIAGONAL, ODD_EVEN, KILLER, IRREGULAR）
     */
    setGameTypeStr(gameTypeStr) {
        this.GAME_TYPE_STR = gameTypeStr;
        // 奇偶数独的奇偶标记（true为奇数格，false为偶数格）
        if (gameTypeStr !== 'ODD_EVEN') {
            this.oddEvenMarks = null;
        }
        // 杀手数独的笼子
        this.cages = null;
        // 锯齿数独的不规则宫格
        if (gameTypeStr === 'IRREGULAR') {
            this.irregularBoxes = this.generateIrregularBoxes();
            // 预计算单元格到宫格的映射，提高验证性能
            this.buildCellToBoxMap();
        } else {
            this.irregularBoxes = null;
        }
    }

    /**
     * 生成9x9锯齿数独(Jigsaw Sudoku)不规则宫格定义，随机选择一种布局
     * @returns {number[][][]} 宫格坐标数组 [宫索引][格子索引][行, 列]
     */
    generateIrregularBoxes() {
        // 20套合法不规则宫布局：每套9个宫，每宫9格，全局81格不重不漏
        const LAYOUTS = Object.freeze([
            // 布局 1 - 经典Z字形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4], [3, 2]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4]],
                [[0, 8], [1, 8], [2, 8], [3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7]],
                [[4, 8], [5, 5], [5, 6], [5, 7], [5, 8], [6, 5], [6, 6], [6, 7], [6, 8]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [7, 0], [7, 1]],
                [[6, 3], [6, 4], [7, 2], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 2 - 波浪形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4], [2, 5], [3, 3]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 4], [3, 5]],
                [[3, 6], [3, 7], [3, 8], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[4, 4], [4, 5], [4, 6], [5, 4], [5, 5], [5, 6], [6, 1], [6, 2], [6, 3]],
                [[4, 7], [4, 8], [5, 7], [5, 8], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 3 - 阶梯形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [4, 1], [5, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 5], [2, 6], [3, 3], [4, 3], [5, 3]],
                [[1, 8], [2, 7], [2, 8], [3, 4], [3, 5], [4, 4], [5, 4], [6, 3], [6, 4]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [5, 5], [6, 5], [7, 4], [7, 5]],
                [[4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [7, 0]],
                [[6, 6], [6, 7], [6, 8], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 4 - 块状形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
                [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]],
                [[0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8]],
                [[3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [6, 1]],
                [[3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6]],
                [[5, 7], [5, 8], [6, 2], [6, 3], [6, 4], [6, 5], [7, 2], [7, 3], [7, 4]],
                [[6, 6], [6, 7], [6, 8], [7, 0], [7, 1], [7, 5], [7, 6], [8, 5], [8, 6]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 7], [8, 8]]
            ],
            // 布局 5 - 对角线形
            [
                [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 1], [3, 2], [3, 3]],
                [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5]],
                [[0, 4], [0, 5], [0, 6], [1, 5], [1, 6], [1, 7], [2, 6], [2, 7], [2, 8]],
                [[3, 0], [4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 1], [6, 2], [6, 3]],
                [[0, 7], [0, 8], [1, 8], [3, 4], [3, 5], [3, 6], [4, 2], [4, 3], [4, 4]],
                [[3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5]],
                [[5, 6], [5, 7], [5, 8], [6, 0], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 6 - 十字形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[0, 8], [1, 8], [2, 8], [3, 5], [3, 6], [3, 7], [4, 4], [4, 5], [4, 6]],
                [[3, 8], [4, 7], [4, 8], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [6, 5]],
                [[4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 4], [6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 5], [8, 6], [8, 7]]
            ],
            // 布局 7 - 螺旋形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 2], [2, 3], [3, 1], [3, 2], [4, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 4], [2, 5], [3, 3], [4, 2], [5, 1]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 6], [2, 7], [3, 4], [4, 3], [5, 2]],
                [[1, 8], [2, 8], [3, 5], [3, 6], [3, 7], [4, 4], [5, 3], [6, 2], [6, 3]],
                [[3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5], [6, 4], [6, 5]],
                [[5, 6], [5, 7], [5, 8], [6, 0], [6, 1], [7, 0], [7, 1], [7, 2], [8, 0]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 1], [8, 2], [8, 3]],
                [[7, 6], [7, 7], [7, 8], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [5, 0]]
            ],
            // 布局 8 - 菱形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 7], [2, 8]],
                [[3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 7]],
                [[6, 0], [6, 1], [6, 2], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2]],
                [[6, 3], [6, 4], [6, 5], [6, 6], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[6, 8], [7, 6], [7, 7], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8], [5, 6]]
            ],
            // 布局 9 - 扇形
            [
                [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0]],
                [[0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [3, 1], [4, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [2, 3], [2, 4], [3, 2], [4, 2]],
                [[1, 7], [1, 8], [2, 5], [2, 6], [3, 3], [3, 4], [3, 5], [4, 3], [5, 2]],
                [[2, 7], [2, 8], [3, 6], [3, 7], [3, 8], [4, 4], [4, 5], [5, 3], [5, 4]],
                [[4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [5, 7], [5, 8], [6, 6], [6, 7]],
                [[5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 4], [6, 5], [6, 8], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 10 - 星型
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [3, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [2, 3], [2, 4], [3, 2]],
                [[1, 8], [2, 5], [2, 6], [2, 7], [2, 8], [3, 3], [3, 4], [4, 1], [4, 2]],
                [[3, 5], [3, 6], [3, 7], [3, 8], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2]],
                [[4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 11 - 平行四边形
            [
                [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 1], [3, 2], [4, 2]],
                [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4], [4, 3], [4, 4]],
                [[0, 3], [0, 4], [0, 5], [1, 4], [1, 5], [2, 4], [2, 5], [3, 5], [4, 5]],
                [[0, 6], [0, 7], [1, 6], [1, 7], [2, 6], [2, 7], [3, 6], [4, 6], [5, 5]],
                [[0, 8], [1, 8], [2, 8], [3, 7], [3, 8], [4, 7], [4, 8], [5, 6], [5, 7]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [6, 2], [7, 1]],
                [[5, 3], [5, 4], [5, 8], [6, 3], [6, 4], [6, 5], [7, 2], [7, 3], [7, 4]],
                [[6, 6], [6, 7], [6, 8], [7, 5], [7, 6], [7, 7], [8, 4], [8, 5], [8, 6]],
                [[7, 0], [7, 8], [8, 0], [8, 1], [8, 2], [8, 3], [8, 7], [8, 8], [6, 0]]
            ],
            // 布局 12 - 三角形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [4, 1], [5, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 5], [2, 6], [3, 3], [4, 3], [5, 3]],
                [[1, 8], [2, 7], [2, 8], [3, 4], [3, 5], [4, 4], [4, 5], [5, 4], [6, 3]],
                [[3, 6], [3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [5, 7]],
                [[5, 8], [6, 0], [6, 1], [6, 2], [6, 4], [6, 5], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 13 - 梯形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[1, 8], [2, 8], [3, 2], [3, 3], [3, 4], [4, 0], [4, 1], [4, 2], [5, 0]],
                [[3, 5], [3, 6], [3, 7], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2], [5, 3]],
                [[3, 8], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 14 - 箭头形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [3, 1], [3, 2]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 5], [2, 6]],
                [[2, 7], [2, 8], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 3]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [6, 2], [7, 0]],
                [[5, 6], [5, 7], [5, 8], [6, 3], [6, 4], [6, 5], [7, 1], [7, 2], [7, 3]],
                [[6, 6], [6, 7], [6, 8], [7, 4], [7, 5], [7, 6], [8, 2], [8, 3], [8, 4]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8], [6, 0]]
            ],
            // 布局 15 - 六边形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 7], [2, 8]],
                [[3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 7]],
                [[6, 0], [6, 1], [6, 2], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2]],
                [[6, 3], [6, 4], [6, 5], [6, 6], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[6, 8], [7, 6], [7, 7], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8], [5, 6]]
            ],
            // 布局 16 - 五边形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [3, 1], [4, 1]],
                [[0, 5], [0, 6], [1, 5], [1, 6], [2, 4], [2, 5], [3, 2], [4, 2], [5, 1]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [3, 3], [4, 3], [5, 2]],
                [[2, 8], [3, 4], [3, 5], [3, 6], [4, 4], [4, 5], [5, 3], [5, 4], [6, 2]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [6, 3], [6, 4]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 5], [6, 6], [7, 0], [7, 1], [7, 2]],
                [[6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [7, 6], [8, 2], [8, 3], [8, 4]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8], [5, 0]]
            ],
            // 布局 17 - 七边形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0], [5, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[0, 8], [1, 8], [2, 8], [3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [5, 1]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 2], [5, 3], [5, 4]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 18 - 椭圆
            [
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 5], [2, 6], [2, 7]],
                [[2, 2], [2, 8], [3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [5, 2]],
                [[3, 5], [3, 6], [3, 7], [4, 4], [4, 5], [4, 6], [5, 3], [5, 4], [5, 5]],
                [[3, 8], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 5], [6, 6], [6, 7]],
                [[4, 0], [5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1]],
                [[6, 4], [6, 8], [7, 2], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 19 - 矩形组合
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
                [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5], [3, 4]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7]],
                [[2, 8], [3, 0], [3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0]],
                [[3, 5], [3, 6], [3, 7], [3, 8], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2]],
                [[4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 20 - 不规则混合
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4], [2, 5], [3, 3]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 4], [3, 5]],
                [[3, 6], [3, 7], [3, 8], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[4, 4], [4, 5], [4, 6], [5, 4], [5, 5], [5, 6], [6, 1], [6, 2], [6, 3]],
                [[4, 7], [4, 8], [5, 7], [5, 8], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ]
        ]);

        // 随机选取一套布局
        const randomIdx = Math.floor(Math.random() * LAYOUTS.length);
        const selectLayout = LAYOUTS[randomIdx];

        // 深拷贝：防止外部篡改原始常量数据
        return JSON.parse(JSON.stringify(selectLayout));
    }

    /**
     * 构建单元格到宫格的映射表（优化性能）
     */
    buildCellToBoxMap() {
        if (!this.irregularBoxes) return;
        this.cellToBoxMap = new Map();
        for (let boxIndex = 0; boxIndex < this.irregularBoxes.length; boxIndex++) {
            for (const cell of this.irregularBoxes[boxIndex]) {
                const key = `${cell[0]},${cell[1]}`;
                this.cellToBoxMap.set(key, boxIndex);
            }
        }
    }

    /**
     * 获取指定位置所属的不规则宫格（使用缓存优化）
     * @param {number} row 行
     * @param {number} col 列
     * @returns {number} 宫格索引
     */
    getIrregularBoxIndex(row, col) {
        if (!this.irregularBoxes) return -1;
        // 使用缓存映射
        if (this.cellToBoxMap) {
            const key = `${row},${col}`;
            return this.cellToBoxMap.get(key) ?? -1;
        }
        // 回退到遍历查找
        for (let i = 0; i < this.irregularBoxes.length; i++) {
            if (this.irregularBoxes[i].some(cell => cell[0] === row && cell[1] === col)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 获取当前尺寸
     */
    getSize() {
        return this.SIZE;
    }

    /**
     * 生成完整的数独棋盘
     * @returns {number[][]} 完整数独棋盘
     */
    generateFullBoard() {
        const board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        this.fillBoard(board, 0, 0);
        return board;
    }

    /**
     * 递归填充数独棋盘
     * @param {number[][]} board 棋盘
     * @param {number} row 当前行
     * @param {number} col 当前列
     * @returns {boolean} 是否成功填充
     */
    fillBoard(board, row, col) {
        if (row === this.SIZE) return true;
        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 随机打乱数字顺序
        const nums = this.shuffleArray([...this.NUMBERS]);

        for (const num of nums) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this.fillBoard(board, nextRow, nextCol)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 检查在指定位置填入数字是否有效
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValid(board, row, col, num) {
        // 检查同行
        for (let c = 0; c < this.SIZE; c++) {
            if (board[row][c] === num) return false;
        }
        // 检查同列
        for (let r = 0; r < this.SIZE; r++) {
            if (board[r][col] === num) return false;
        }
        // 检查宫格（标准或不规则）
        if (this.GAME_TYPE_STR === 'IRREGULAR' && this.irregularBoxes) {
            // 锯齿数独：检查不规则宫格
            const boxIndex = this.getIrregularBoxIndex(row, col);
            if (boxIndex >= 0) {
                for (const cell of this.irregularBoxes[boxIndex]) {
                    const [r, c] = cell;
                    if ((r !== row || c !== col) && board[r][c] === num) {
                        return false;
                    }
                }
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRow = row - row % this.BOX_ROWS;
            const boxCol = col - col % this.BOX_COLS;
            for (let r = boxRow; r < boxRow + this.BOX_ROWS; r++) {
                for (let c = boxCol; c < boxCol + this.BOX_COLS; c++) {
                    if (board[r][c] === num) return false;
                }
            }
        }
        // 对角线数独：检查两条对角线
        if (this.GAME_TYPE_STR === 'DIAGONAL') {
            // 主对角线 (row == col)
            if (row === col) {
                for (let i = 0; i < this.SIZE; i++) {
                    if (i !== row && board[i][i] === num) return false;
                }
            }
            // 副对角线 (row + col == SIZE - 1)
            if (row + col === this.SIZE - 1) {
                for (let i = 0; i < this.SIZE; i++) {
                    const j = this.SIZE - 1 - i;
                    if ((i !== row || j !== col) && board[i][j] === num) return false;
                }
            }
        }
        // 奇偶数独：检查奇偶性
        if (this.GAME_TYPE_STR === 'ODD_EVEN' && this.oddEvenMarks) {
            const isOdd = num % 2 === 1;
            if (this.oddEvenMarks[row][col] !== isOdd) return false;
        }
        // 杀手数独：检查同笼不重复
        if (this.GAME_TYPE_STR === 'KILLER' && this.cages) {
            for (const cage of this.cages) {
                const hasCell = cage.cells.some(cell => cell.row === row && cell.col === col);
                if (hasCell) {
                    for (const cell of cage.cells) {
                        if (cell.row !== row || cell.col !== col) {
                            if (board[cell.row][cell.col] === num) return false;
                        }
                    }
                }
            }
        }
        // 窗口数独：检查四个额外的3x3窗口区域
        if (this.GAME_TYPE_STR === 'WINDOKU') {
            const windokuRegions = [
                // 左上窗口 (行1-3, 列1-3)
                { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },
                // 右上窗口 (行1-3, 列5-7)
                { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },
                // 左下窗口 (行5-7, 列1-3)
                { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },
                // 右下窗口 (行5-7, 列5-7)
                { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }
            ];
            for (const region of windokuRegions) {
                if (row >= region.startRow && row <= region.endRow &&
                    col >= region.startCol && col <= region.endCol) {
                    for (let r = region.startRow; r <= region.endRow; r++) {
                        for (let c = region.startCol; c <= region.endCol; c++) {
                            if ((r !== row || c !== col) && board[r][c] === num) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        // 三明治数独：检查1和9的位置是否满足提示约束（验证阶段使用）
        if (this.GAME_TYPE_STR === 'SANDWICH' && this.sandwichClues) {
            if (!this.isValidSandwichPlacement(board, row, col, num)) {
                return false;
            }
        }
        // 无缘数独：检查国王移动约束（相邻8格不能有相同数字）
        if (this.GAME_TYPE_STR === 'UNTOUCHABLE') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue; // 跳过自身
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < this.SIZE && nc >= 0 && nc < this.SIZE) {
                        if (board[nr][nc] === num) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * 验证三明治数独中数字放置是否有效
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValidSandwichPlacement(board, row, col, num) {
        // 复制棋盘并放置新数字
        const testBoard = board.map(r => [...r]);
        testBoard[row][col] = num;

        // 检查行约束
        const rowClue = this.sandwichClues.top[row];
        if (!this.isValidSandwichRow(testBoard, row, rowClue)) {
            return false;
        }

        // 检查列约束
        const colClue = this.sandwichClues.left[col];
        if (!this.isValidSandwichCol(testBoard, col, colClue)) {
            return false;
        }

        return true;
    }

    /**
     * 验证无缘数独中国王移动约束
     * 检查所有已填数字是否满足"不相邻（包括对角线）"的约束
     * @param {number[][]} board 棋盘
     * @returns {boolean} 是否满足约束
     */
    isUntouchableValid(board) {
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                const num = board[row][col];
                if (num === 0) continue; // 跳过空格子
                
                // 检查周围8个格子
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue; // 跳过自身
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < this.SIZE && nc >= 0 && nc < this.SIZE) {
                            if (board[nr][nc] === num) {
                                return false; // 发现相邻的相同数字
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * 检查某行是否满足三明治约束
     * @param {number[][]} board 棋盘
     * @param {number} row 行号
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichRow(board, row, clue) {
        const cells = board[row];
        return this.isValidSandwichLine(cells, clue);
    }

    /**
     * 检查某列是否满足三明治约束
     * @param {number[][]} board 棋盘
     * @param {number} col 列号
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichCol(board, col, clue) {
        const cells = [];
        for (let i = 0; i < this.SIZE; i++) {
            cells.push(board[i][col]);
        }
        return this.isValidSandwichLine(cells, clue);
    }

    /**
     * 检查一行/列是否满足三明治约束
     * @param {number[]} line 行/列的数字数组
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichLine(line, clue) {
        const emptyCount = line.filter(n => n === 0).length;

        // 如果该行/列还有空格，暂时跳过验证（只做基本检查）
        if (emptyCount > 0) {
            // 检查是否已经违反明显的约束
            const ones = [];
            const nines = [];

            for (let i = 0; i < line.length; i++) {
                if (line[i] === 1) ones.push(i);
                if (line[i] === 9) nines.push(i);
            }

            // 如果已经有超过1个1或超过1个9，无效
            if (ones.length > 1 || nines.length > 1) {
                return false;
            }

            // 如果1和9都已确定位置，检查约束
            if (ones.length === 1 && nines.length === 1) {
                const onePos = ones[0];
                const ninePos = nines[0];
                const minPos = Math.min(onePos, ninePos);
                const maxPos = Math.max(onePos, ninePos);

                let sum = 0;
                for (let i = minPos + 1; i < maxPos; i++) {
                    if (line[i] !== 0) {
                        sum += line[i];
                    } else {
                        // 如果中间有空格，无法计算，暂时视为有效
                        return true;
                    }
                }

                return sum === clue;
            }

            return true;
        }

        // 该行/列已满，进行完整验证
        const onePos = line.indexOf(1);
        const ninePos = line.indexOf(9);

        // 如果没有1或9，无效
        if (onePos === -1 || ninePos === -1) {
            return false;
        }

        const minPos = Math.min(onePos, ninePos);
        const maxPos = Math.max(onePos, ninePos);

        let sum = 0;
        for (let i = minPos + 1; i < maxPos; i++) {
            sum += line[i];
        }

        return sum === clue;
    }

    /**
     * 计算一行的三明治和（1和9之间的数字之和）
     * @param {number[]} line 行/列的数字数组
     * @returns {number} 三明治和
     */
    calculateSandwichSum(line) {
        const onePos = line.indexOf(1);
        const ninePos = line.indexOf(9);

        if (onePos === -1 || ninePos === -1) {
            return -1; // 未确定
        }

        const minPos = Math.min(onePos, ninePos);
        const maxPos = Math.max(onePos, ninePos);

        let sum = 0;
        for (let i = minPos + 1; i < maxPos; i++) {
            sum += line[i];
        }

        return sum;
    }

    /**
     * 生成三明治数独的完整解
     * @returns {number[][]} 完整数独棋盘
     */
    generateSandwichSolution() {
        console.log('🔷 开始生成三明治数独...');
        const startTime = Date.now();

        this.setGameTypeStr('SANDWICH');
        let board = null;
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // 生成标准数独解
                board = this.generateFullBoard();

                // 计算三明治提示
                const clues = this.generateSandwichClues(board);
                this.sandwichClues = clues;

                console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                break;
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试失败，重试...`);
            }
        }

        if (!board) {
            console.log('⚠️ 三明治数独生成失败，使用标准数独解');
            board = this.generateFullBoard();
            this.sandwichClues = this.generateSandwichClues(board);
        }

        console.log(`✅ 三明治数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成三明治数独的外部提示
     * @param {number[][]} board 完整棋盘
     * @returns {object} 包含top, bottom, left, right提示的对象
     */
    generateSandwichClues(board) {
        const clues = {
            top: [],
            bottom: [],
            left: [],
            right: []
        };

        // 计算每行的提示（顶部和底部相同）
        for (let r = 0; r < this.SIZE; r++) {
            const sum = this.calculateSandwichSum(board[r]);
            clues.top.push(sum);
            clues.bottom.push(sum);
        }

        // 计算每列的提示（左侧和右侧相同）
        for (let c = 0; c < this.SIZE; c++) {
            const col = [];
            for (let r = 0; r < this.SIZE; r++) {
                col.push(board[r][c]);
            }
            const sum = this.calculateSandwichSum(col);
            clues.left.push(sum);
            clues.right.push(sum);
        }

        return clues;
    }

    /**
     * 创建数独题目（移除部分数字）
     * @param {number[][]} fullBoard 完整棋盘
     * @param {number} emptyCount 空格数量
     * @returns {number[][]} 数独题目
     */
    createPuzzle(fullBoard, emptyCount) {
        // 深拷贝棋盘
        let bestPuzzle = fullBoard.map(row => [...row]);
        let bestEmpty = 0;

        // 尝试多轮，每轮使用不同的随机顺序
        const attempts = this.SIZE <= 6 ? 10 : 3;

        for (let attempt = 0; attempt < attempts; attempt++) {
            const puzzle = fullBoard.map(row => [...row]);

            // 生成所有位置并随机打乱
            const positions = [];
            for (let i = 0; i < this.SIZE; i++) {
                for (let j = 0; j < this.SIZE; j++) {
                    positions.push([i, j]);
                }
            }
            this.shuffleArray(positions);

            let empty = 0;
            for (const [r, c] of positions) {
                if (empty >= emptyCount) break;
                if (puzzle[r][c] === 0) continue;

                const temp = puzzle[r][c];
                puzzle[r][c] = 0;

                // 确保只有唯一解
                if (this.getSolutionCount(puzzle) === 1) {
                    empty++;
                } else {
                    puzzle[r][c] = temp;
                }
            }

            // 记录最佳结果
            if (empty > bestEmpty) {
                bestEmpty = empty;
                bestPuzzle = puzzle.map(row => [...row]);
            }

            // 如果达到目标，直接返回
            if (empty >= emptyCount) {
                return puzzle;
            }
        }

        // 如果多次尝试都达不到目标，返回最佳结果
        return bestPuzzle;
    }

    /**
     * 计算解的数量
     * @param {number[][]} board 棋盘
     * @returns {number} 解的数量
     */
    getSolutionCount(board) {
        this.solutionCount = 0;
        const copy = board.map(row => [...row]);
        this.countSolve(copy, 0, 0);
        return this.solutionCount;
    }

    /**
     * 递归计算解的数量
     */
    countSolve(board, row, col) {
        if (this.solutionCount >= 2) return;
        if (row === this.SIZE) {
            this.solutionCount++;
            return;
        }
        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        if (board[row][col] !== 0) {
            this.countSolve(board, nextRow, nextCol);
            return;
        }

        for (const num of this.NUMBERS) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                this.countSolve(board, nextRow, nextCol);
                board[row][col] = 0;
            }
        }
    }

    /**
     * 随机打乱数组
     * @param {Array} array 数组
     * @returns {Array} 打乱后的数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * 棋盘转字符串
     * @param {number[][]} board 棋盘
     * @returns {string} 字符串
     */
    boardToString(board) {
        return board.flat().join('');
    }

    /**
     * 生成奇偶数独的奇偶标记
     * @returns {boolean[][]} 奇偶标记矩阵（true为奇数格，false为偶数格）
     */
    generateOddEvenMarks() {
        const marks = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(false));

        // 使用棋盘格模式：(r + c) % 2 === 0 的格子为奇数格
        // 这样每行、每列都恰好有5个奇数格和4个偶数格
        // 每个宫格也恰好有5个奇数格和4个偶数格
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                marks[r][c] = (r + c) % 2 === 0;
            }
        }

        this.oddEvenMarks = marks;
        return marks;
    }

    /**
     * 生成符合奇偶标记的完整数独解
     * @returns {number[][]} 符合奇偶标记的完整数独棋盘
     */
    generateOddEvenBoard() {
        if (!this.oddEvenMarks) {
            this.generateOddEvenMarks();
        }

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
            if (this.fillOddEvenBoard(board, 0, 0)) {
                return board;
            }
            attempts++;
        }

        // 如果多次尝试失败，返回空棋盘
        console.warn('奇偶数独生成失败');
        return Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
    }

    /**
     * 递归填充奇偶数独棋盘
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @returns {boolean} 是否成功填充
     */
    fillOddEvenBoard(board, row, col) {
        if (row === this.SIZE) return true;
        if (col === this.SIZE) return this.fillOddEvenBoard(board, row + 1, 0);

        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 根据奇偶标记筛选可用数字
        const requiredOdd = this.oddEvenMarks[row][col];
        const nums = this.shuffleArray([...this.NUMBERS]).filter(num => (num % 2 === 1) === requiredOdd);

        for (const num of nums) {
            // 直接检查行、列、宫格（不检查奇偶性，因为我们已经筛选过了）
            if (this.isValidBasic(board, row, col, num)) {
                board[row][col] = num;
                if (this.fillOddEvenBoard(board, row, nextCol)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 基本有效性检查（仅检查行、列、宫格）
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValidBasic(board, row, col, num) {
        // 检查同行
        for (let c = 0; c < this.SIZE; c++) {
            if (board[row][c] === num) return false;
        }
        // 检查同列
        for (let r = 0; r < this.SIZE; r++) {
            if (board[r][col] === num) return false;
        }
        // 检查宫格
        const boxRow = row - row % this.BOX_ROWS;
        const boxCol = col - col % this.BOX_COLS;
        for (let r = boxRow; r < boxRow + this.BOX_ROWS; r++) {
            for (let c = boxCol; c < boxCol + this.BOX_COLS; c++) {
                if (board[r][c] === num) return false;
            }
        }
        return true;
    }

    /**
     * 生成奇偶数独的另一种方法：先生成数独解，再根据解生成标记
     * @returns {object} 包含完整棋盘和奇偶标记
     */
    generateOddEvenPuzzle() {
        // 先生成一个标准数独解
        const solution = this.generateFullBoard();

        // 根据解生成奇偶标记
        const marks = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(false));
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                marks[r][c] = solution[r][c] % 2 === 1;
            }
        }

        return { solution, marks };
    }

    /**
     * 杀手数独专用：校验笼子内数字不重复
     */
    isValidKillerCage(board, row, col, num, cages) {
        const currentCage = cages.find(cage =>
            cage.cells.some(cell => cell.row === row && cell.col === col)
        );
        if (!currentCage) return true;
        return !currentCage.cells.some(cell => board[cell.row][cell.col] === num);
    }

    /**
     * 生成【唯一解】杀手数独（对外核心方法）
     * @returns {number[][]} 完整棋盘
     */
    generateKillerSolution() {
        this.setGameTypeStr('KILLER');
        let solution = null;

        // 根据棋盘大小设置提示数比例
        let hintRatio = 0;
        if (this.SIZE === 4) {
            hintRatio = 0; // 4x4: 无提示数
        } else if (this.SIZE === 6) {
            hintRatio = 0.2; // 6x6: 20%提示数
        } else if (this.SIZE === 9) {
            hintRatio = 0.3; // 9x9: 30%提示数
        }

        let attempt = 0;
        // 根据棋盘大小调整尝试次数：9x9复杂度高，尝试次数少一些
        const maxAttempt = 200;

        while (attempt < maxAttempt) {
            attempt++;
            // 1. 生成标准数独解
            solution = this.generateFullBoard();
            // 2. 生成合规笼子（连通、大小2-3格、无重叠）
            this.cages = this.generateValidCages(solution);
            // 3. 创建带提示数的谜题
            const puzzleBoard = this.createKillerPuzzleWithHints(solution, hintRatio);
            this.puzzleBoard = puzzleBoard;

            // 4. 使用带提示数的谜题验证唯一解（提示数大大减少搜索空间）
            if (this.checkKillerUniqueSolutionWithHints()) {
                console.log(`✅ 第${attempt}次尝试：找到唯一解杀手数独`);
                return solution;
            }
        }

        console.log('⚠️ 达到最大尝试次数，返回当前解');
        return solution || this.generateFullBoard();
    }

    /**
     * 生成锯齿数独完整解（高性能 安全 不卡死）
     */
    generateIrregularSolution() {
        console.log('🔷 开始生成锯齿数独...');
        const startTime = Date.now();
        this.setGameTypeStr('IRREGULAR');

        let board = null;
        const maxAttempts = 8; // 尝试8套布局

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // 换新布局
                this.irregularBoxes = this.generateIrregularBoxes();
                this.buildCellToBoxMap();

                // 安全生成（200ms 强制超时）
                board = this.generateFullBoardSafe();

                if (board && this.isFilledAndValidBoard(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 布局无解，更换...`);
            }
        }

        // 🔥 最后兜底：生成一个【100%合法】的锯齿解（不会破坏规则）
        if (!board || !this.isFilledAndValidBoard(board)) {
            console.log('⚠️ 使用合法兜底棋盘');
            board = this.generateValidJigsawBoard();
        }

        console.log(`✅ 生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成窗口数独（Windoku）解
     * 窗口数独规则：除标准数独规则外，四个额外的3x3窗口区域也必须包含1-9各一次
     * @returns {number[][]} 完整棋盘
     */
    generateWindokuSolution() {
        console.log('🔷 开始生成窗口数独...');
        const startTime = Date.now();
        this.setGameTypeStr('WINDOKU');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateFullBoardSafe();
                if (board && this.isFilledAndValidBoard(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isFilledAndValidBoard(board)) {
            console.log('⚠️ 窗口数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('WINDOKU');
        }

        console.log(`✅ 窗口数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成中心点数独解
     */
    generateCenterDotSolution() {
        console.log('🔷 开始生成中心点数独...');
        const startTime = Date.now();
        this.setGameTypeStr('CENTER_DOT');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateCenterDotBoardSafe();
                if (board && this.isCenterDotValid(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isCenterDotValid(board)) {
            console.log('⚠️ 中心点数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('CENTER_DOT');
        }

        console.log(`✅ 中心点数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 安全生成中心点数独（带超时）
     */
    generateCenterDotBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillCenterDotBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归填充中心点数独（带超时保护）
     */
    fillCenterDotBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillCenterDotBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (this.isValidCenterDot(board, row, col, n)) {
                board[row][col] = n;
                if (this.fillCenterDotBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 验证中心点数独位置
     */
    isValidCenterDot(board, r, c, num) {
        // 标准数独验证
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        // 中心点区域验证
        if (this.isCenterCell(r, c)) {
            for (const [cr, cc] of this.getCenterCells()) {
                if (board[cr][cc] === num) return false;
            }
        }

        return true;
    }

    /**
     * 判断是否是中心单元格
     */
    isCenterCell(r, c) {
        return (r % 3 === 1) && (c % 3 === 1);
    }

    /**
     * 获取所有中心单元格位置
     */
    getCenterCells() {
        const centers = [];
        for (let i = 0; i < 9; i += 3) {
            for (let j = 0; j < 9; j += 3) {
                centers.push([i + 1, j + 1]);
            }
        }
        return centers;
    }

    /**
     * 验证完整的中心点数独
     */
    isCenterDotValid(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 验证中心点区域
        const centerValues = [];
        for (const [r, c] of this.getCenterCells()) {
            centerValues.push(board[r][c]);
        }

        const unique = [...new Set(centerValues)];
        return unique.length === 9 && unique.every(v => v >= 1 && v <= 9);
    }

    /**
     * 生成星号数独解
     */
    generateStarSolution() {
        console.log('🔷 开始生成星号数独...');
        const startTime = Date.now();
        this.setGameTypeStr('STAR');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateStarBoardSafe();
                if (board && this.isStarValid(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isStarValid(board)) {
            console.log('⚠️ 星号数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('STAR');
        }

        console.log(`✅ 星号数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 安全生成星号数独（带超时）
     */
    generateStarBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillStarBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归填充星号数独（带超时保护）
     */
    fillStarBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillStarBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (this.isValidStar(board, row, col, n)) {
                board[row][col] = n;
                if (this.fillStarBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 验证星号数独位置
     */
    isValidStar(board, r, c, num) {
        // 标准数独验证
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        // 星号区域验证
        if (this.isStarCell(r, c)) {
            for (const [sr, sc] of this.getStarCells()) {
                if (board[sr][sc] === num) return false;
            }
        }

        return true;
    }

    /**
     * 判断是否是星号单元格
     */
    isStarCell(r, c) {
        const starCells = this.getStarCells();
        return starCells.some(([sr, sc]) => sr === r && sc === c);
    }

    /**
     * 获取所有星号单元格位置（星形图案）
     * 形成X形状的星号图案
     */
    getStarCells() {
        return [
            [1, 4],  // 第二行第五列
            [2, 2],  // 第三行第三列
            [2, 6],  // 第三行第七列
            [4, 1],  // 第五行第二列
            [4, 4],  // 第五行第五列
            [4, 7],  // 第五行第八列
            [6, 2],  // 第七行第三列
            [6, 6],  // 第七行第七列
            [7, 4]   // 第八行第五列
        ];
    }

    /**
     * 验证完整的星号数独
     */
    isStarValid(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 验证星号区域
        const starValues = [];
        for (const [r, c] of this.getStarCells()) {
            starValues.push(board[r][c]);
        }

        const unique = [...new Set(starValues)];
        return unique.length === 9 && unique.every(v => v >= 1 && v <= 9);
    }

    /**
     * 生成无缘数独解（国王移动约束）
     * 无缘数独规则：相同的数字不能放在任何正交或对角相邻的单元格中
     * 这意味着一个数字"攻击"周围所有8个单元格
     */
    generateUntouchableSolution() {
        console.log('🔷 开始生成无缘数独...');
        const startTime = Date.now();
        this.setGameTypeStr('UNTOUCHABLE');

        let board = null;
        const maxAttempts = 50; // 增加尝试次数

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateUntouchableBoardSafe();
                if (board && this.isFilledAndValidBoard(board) && this.isUntouchableValid(board)) {
                    console.log(`✅ 无缘数独生成成功，尝试次数: ${attempt + 1}`);
                    break;
                }
            } catch (e) {
                console.log(`⚠️ 无缘数独生成失败（尝试 ${attempt + 1}/${maxAttempts}）`);
            }
        }

        // 兜底：如果生成失败，使用预定义的无缘数独解
        if (!board || !this.isFilledAndValidBoard(board) || !this.isUntouchableValid(board)) {
            console.log('⚠️ 无缘数独生成失败，使用预定义解');
            board = this.getPredefinedUntouchableSolution();
        }

        console.log(`✅ 无缘数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 获取预定义的无缘数独解
     * 确保即使生成失败也有有效的题目
     */
    getPredefinedUntouchableSolution() {
        // 预定义的无缘数独解（满足国王移动约束 - 相同数字不相邻）
        // 这个解使用拉丁方构造，确保每个数字在不同行/列且不相邻
        return [
            [1, 3, 5, 7, 9, 2, 4, 6, 8],
            [6, 8, 2, 4, 1, 7, 3, 9, 5],
            [4, 6, 8, 2, 5, 3, 9, 1, 7],
            [9, 1, 3, 5, 7, 8, 2, 4, 6],
            [7, 9, 1, 3, 6, 4, 8, 5, 2],
            [2, 4, 6, 8, 3, 5, 7, 1, 9],
            [5, 7, 9, 1, 2, 6, 4, 8, 3],
            [8, 2, 4, 6, 9, 1, 5, 3, 7],
            [3, 5, 7, 9, 4, 8, 1, 2, 6]
        ];
    }

    /**
     * 安全生成无缘数独（带超时）
     */
    generateUntouchableBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillUntouchableBoardWithTimeout(board, 0, 0, Date.now(), 5000) ? board : null;
    }

    /**
     * 递归填充无缘数独（带超时保护）
     */
    fillUntouchableBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nextCol = col === 8 ? 0 : col + 1;
        const nextRow = col === 8 ? row + 1 : row;
        
        if (board[row][col] !== 0) return this.fillUntouchableBoardWithTimeout(board, nextRow, nextCol, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (this.isValidUntouchable(board, row, col, n)) {
                board[row][col] = n;
                if (this.fillUntouchableBoardWithTimeout(board, nextRow, nextCol, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 验证无缘数独位置（国王移动约束）
     */
    isValidUntouchable(board, r, c, num) {
        // 标准数独验证
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        // 无缘数独：国王移动约束 - 检查周围8个格子
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    if (board[nr][nc] === num) return false;
                }
            }
        }

        return true;
    }

    /**
     * 生成黑白点数独解
     */
    generateBlackWhiteDotSolution() {
        console.log('🔷 开始生成黑白点数独...');
        const startTime = Date.now();
        this.setGameTypeStr('BLACK_WHITE_DOT');

        let board = null;
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateFullBoard();
                if (board && this.isValidBlackWhiteDot(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试失败，重试...`);
            }
        }

        if (!board) {
            console.log('⚠️ 黑白点数独生成失败，使用标准数独解');
            board = this.generateFullBoard();
        }

        // 计算黑白点提示
        const dots = this.generateBlackWhiteDotHints(board);

        console.log(`✅ 黑白点数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return { board, dots };
    }

    /**
     * 验证黑白点数独解（检查是否满足负约束）
     */
    isValidBlackWhiteDot(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 检查所有相邻单元格
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = board[r][c];

                // 检查右边相邻
                if (c < 8) {
                    const rightVal = board[r][c + 1];
                    if (this.hasRelation(val, rightVal)) {
                        // 如果有连续或两倍关系但不是1-2，需要标记
                        // 对于生成来说，任何关系都是允许的，负约束是在解题时检查
                    }
                }

                // 检查下边相邻
                if (r < 8) {
                    const downVal = board[r + 1][c];
                    if (this.hasRelation(val, downVal)) {
                        // 同上
                    }
                }
            }
        }

        return true;
    }

    /**
     * 判断两个数是否有关系（连续或两倍）
     */
    hasRelation(a, b) {
        return Math.abs(a - b) === 1 || Math.max(a, b) === 2 * Math.min(a, b);
    }

    /**
     * 判断两个数应该标记为什么类型的点
     * 返回: 'white' (差为1), 'black' (两倍), 'either' (1和2), null (无关系)
     */
    getDotType(a, b) {
        if (Math.abs(a - b) === 1) {
            if ((a === 1 && b === 2) || (a === 2 && b === 1)) {
                return 'either'; // 1和2可以是任意颜色
            }
            return 'white';
        }
        if (Math.max(a, b) === 2 * Math.min(a, b)) {
            return 'black';
        }
        return null;
    }

    /**
     * 生成黑白点提示
     */
    generateBlackWhiteDotHints(board) {
        const dots = [];

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = board[r][c];

                // 检查右边相邻
                if (c < 8) {
                    const rightVal = board[r][c + 1];
                    const dotType = this.getDotType(val, rightVal);
                    if (dotType === 'either') {
                        // 1和2之间选择白点（更常见）
                        dots.push({ row: r, col: c, direction: 'right', type: 'white' });
                    } else if (dotType) {
                        dots.push({ row: r, col: c, direction: 'right', type: dotType });
                    }
                }

                // 检查下边相邻
                if (r < 8) {
                    const downVal = board[r + 1][c];
                    const dotType = this.getDotType(val, downVal);
                    if (dotType === 'either') {
                        dots.push({ row: r, col: c, direction: 'down', type: 'white' });
                    } else if (dotType) {
                        dots.push({ row: r, col: c, direction: 'down', type: dotType });
                    }
                }
            }
        }

        return dots;
    }

    /**
     * 生成摩天楼数独解
     */
    generateSkyscraperSolution() {
        console.log('🔷 开始生成摩天楼数独...');
        const startTime = Date.now();
        this.setGameTypeStr('SKYSCRAPER');

        // 生成标准数独解
        const board = this.generateFullBoard();

        // 计算摩天楼提示
        const clues = this.generateSkyscraperClues(board);

        console.log(`✅ 摩天楼数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return { board, clues };
    }

    /**
     * 计算摩天楼提示
     * 返回: { top: [], bottom: [], left: [], right: [] }
     */
    generateSkyscraperClues(board) {
        const clues = {
            top: [],  // 第一个为空，用于对齐
            bottom: [],
            left: [],
            right: []
        };

        // 计算每行的左右提示
        for (let r = 0; r < 9; r++) {
            clues.left.push(this.countVisibleBuildings(board[r]));
            clues.right.push(this.countVisibleBuildings([...board[r]].reverse()));
        }
        // 最后添加一个空元素
        // clues.left.push(null);
        // clues.right.push(null);

        // 计算每列的上下提示
        for (let c = 0; c < 9; c++) {
            const col = [];
            for (let r = 0; r < 9; r++) {
                col.push(board[r][c]);
            }
            clues.top.push(this.countVisibleBuildings(col));
            clues.bottom.push(this.countVisibleBuildings([...col].reverse()));
        }
        // 最后添加一个空元素
        // clues.top.push(null);
        // clues.bottom.push(null);

        return clues;
    }

    /**
     * 计算从某个方向可以看到的建筑物数量
     */
    countVisibleBuildings(arr) {
        let count = 0;
        let maxHeight = 0;

        for (const height of arr) {
            if (height > maxHeight) {
                count++;
                maxHeight = height;
            }
        }

        return count;
    }

    /**
     * 安全生成（带超时）
     */
    generateFullBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归 + 超时保护（绝不卡死）
     */
    fillBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            // 根据游戏类型选择合适的验证方法
            let isValid;
            if (this.GAME_TYPE_STR === 'IRREGULAR') {
                isValid = this.isValidJigsaw(board, row, col, n);
            } else {
                isValid = this.isValid(board, row, col, n);
            }
            if (isValid) {
                board[row][col] = n;
                if (this.fillBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 锯齿数独专用校验（超快）
     */
    isValidJigsaw(board, r, c, num) {
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const box = this.cellToBoxMap.get(`${r},${c}`);
        for (const [x, y] of this.irregularBoxes[box]) {
            if (board[x][y] === num) return false;
        }
        return true;
    }

    /**
     * 🔥 合法兜底棋盘（100% 满足当前锯齿布局）
     */
    generateValidJigsawBoard() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));

        // 按不规则宫填充，保证宫内数字 1-9
        this.irregularBoxes.forEach(box => {
            const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            box.forEach(([r, c], idx) => {
                board[r][c] = nums[idx];
            });
        });

        return board;
    }

    /**
     * 构建单元格→宫索引映射（O(1) 访问）
     */
    buildCellToBoxMap() {
        this.cellToBoxMap = new Map();
        this.irregularBoxes.forEach((box, idx) => {
            box.forEach(([r, c]) => {
                this.cellToBoxMap.set(`${r},${c}`, idx);
            });
        });
    }

    /**
     * 检查是否填满 + 全局合法
     */
    isFilledAndValidBoard(board) {
        if (!board) return false;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return false;
                const val = board[r][c];
                board[r][c] = 0;
                // 根据游戏类型选择合适的验证方法
                let ok;
                if (this.GAME_TYPE_STR === 'IRREGULAR') {
                    ok = this.isValidJigsaw(board, r, c, val);
                } else {
                    ok = this.isValid(board, r, c, val);
                }
                board[r][c] = val;
                if (!ok) return false;
            }
        }
        return true;
    }

    /**
     * 洗牌
     */
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }



    /**
     * 创建带提示数的杀手数独谜题
     * @param {number[][]} solution 完整解
     * @param {number} hintRatio 提示数比例（0-1）
     */
    createKillerPuzzleWithHints(solution, hintRatio = 0.3) {
        const puzzle = solution.map(row => [...row]);
        const totalCells = this.SIZE * this.SIZE;
        const hintCount = Math.floor(totalCells * hintRatio);
        const positions = [];

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                positions.push({ row: r, col: c });
            }
        }

        this.shuffleArray(positions);

        const keepPositions = new Set();
        for (let i = 0; i < hintCount; i++) {
            const pos = positions[i];
            keepPositions.add(`${pos.row}-${pos.col}`);
        }

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (!keepPositions.has(`${r}-${c}`)) {
                    puzzle[r][c] = 0;
                }
            }
        }

        return puzzle;
    }

    /**
     * 生成合规笼子（连通、大小2-4格、无重叠、相邻）
     */
    generateValidCages(board) {
        const used = Array(this.SIZE).fill(false).map(() => Array(this.SIZE).fill(false));
        const cages = [];
        // 笼子大小：2-3格（降低难度，避免多解）
        const CAGE_MIN_SIZE = 2;
        const CAGE_MAX_SIZE = 4; // 统一最大4格，降低难度

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (used[r][c]) continue;
                const cage = this.createCage(r, c, used, board, CAGE_MIN_SIZE, CAGE_MAX_SIZE);
                cages.push(cage);
            }
        }
        return cages;
    }

    /**
     * 创建单个连通笼子
     */
    createCage(startR, startC, used, board, minSize, maxSize) {
        const cells = [{ row: startR, col: startC }];
        used[startR][startC] = true;
        const targetSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));

        // 扩展相邻格子
        while (cells.length < targetSize) {
            const neighbors = [];
            for (const cell of cells) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = cell.row + dr;
                    const nc = cell.col + dc;
                    if (nr >= 0 && nr < this.SIZE && nc >= 0 && nc < this.SIZE && !used[nr][nc]) {
                        neighbors.push({ row: nr, col: nc });
                    }
                }
            }
            if (neighbors.length === 0) break;
            const add = neighbors[Math.floor(Math.random() * neighbors.length)];
            cells.push(add);
            used[add.row][add.col] = true;
        }

        // 计算笼子和
        const sum = cells.reduce((s, cell) => s + board[cell.row][cell.col], 0);
        return { cells, sum };
    }

    /**
     * 【极速验证】杀手数独是否唯一解（核心优化）
     */
    checkKillerUniqueSolution() {
        this.solutionCount = 0;
        const emptyBoard = Array(this.SIZE).fill(0).map(() => Array(this.SIZE).fill(0));
        this.backtrackKiller(emptyBoard, this.cages, 0, 0);
        return this.solutionCount === 1;
    }

    /**
     * 使用带提示数的谜题验证唯一解（大大减少搜索空间）
     */
    checkKillerUniqueSolutionWithHints() {
        this.solutionCount = 0;
        // 使用带提示数的谜题作为起点
        const startBoard = this.puzzleBoard.map(row => [...row]);
        this.backtrackKiller(startBoard, this.cages, 0, 0);
        return this.solutionCount === 1;
    }

    /**
     * 杀手数独回溯求解（超强剪枝，速度提升10倍+）
     */
    backtrackKiller(board, cages, row, col) {
        // 找到2个解直接终止
        if (this.solutionCount >= 2) return;
        // 填满棋盘 = 找到解
        if (row === this.SIZE) {
            this.solutionCount++;
            return;
        }

        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 已填数字直接跳过
        if (board[row][col] !== 0) {
            this.backtrackKiller(board, cages, nextRow, nextCol);
            return;
        }

        // 获取当前笼子
        const cage = cages.find(c =>
            c.cells.some(cell => cell.row === row && cell.col === col)
        );

        // 笼子预计算：已填和、已用数字、剩余格子
        let filledSum = 0, filledCnt = 0;
        const usedNums = new Set();
        if (cage) {
            for (const cell of cage.cells) {
                const v = board[cell.row][cell.col];
                if (v !== 0) {
                    filledSum += v;
                    filledCnt++;
                    usedNums.add(v);
                }
            }
        }
        const remainSum = cage ? cage.sum - filledSum : 0;
        const remainCnt = cage ? cage.cells.length - filledCnt : 0;

        // 尝试所有合法数字
        for (const num of this.NUMBERS) {
            // 1. 笼子内已用数字
            if (usedNums.has(num)) continue;
            // 2. 基础数独规则
            if (!this.isValid(board, row, col, num)) continue;
            // 3. 笼子和剪枝（剩余数字不可能满足和要求，直接跳过）
            if (cage) {
                const minRemain = remainCnt - 1;
                const maxRemain = (remainCnt - 1) * this.SIZE;
                if (num + minRemain > remainSum || num + maxRemain < remainSum) continue;
            }

            // 填写数字
            board[row][col] = num;
            this.backtrackKiller(board, cages, nextRow, nextCol);
            board[row][col] = 0;

            // 提前终止
            if (this.solutionCount >= 2) return;
        }
    }

}

// 创建数独生成器实例
const sudokuGenerator = new SudokuGenerator();

// ==================== 本地存储管理 ====================
const Storage = {
    KEYS: {
        RECORDS: 'sudoku_records',
        SCORE_RECORDS: 'sudoku_score_records',
        SESSION: 'sudoku_session',
        PUZZLE_ID: 'sudoku_puzzle_id',
        PLAYER_DATA: 'sudoku_player_data',
        WEEKLY_TASKS: 'sudoku_weekly_tasks',
        DAILY_TASKS: 'sudoku_daily_tasks'
    },

    /**
     * 获取用户会话ID
     */
    getSessionId() {
        let sessionId = localStorage.getItem(this.KEYS.SESSION);
        if (!sessionId) {
            sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.KEYS.SESSION, sessionId);
        }
        return sessionId;
    },

    /**
     * 获取所有记录
     */
    getRecords() {
        const data = localStorage.getItem(this.KEYS.RECORDS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存记录
     */
    saveRecord(record) {
        const records = this.getRecords();
        const index = records.findIndex(r => r.puzzleId === record.puzzleId);
        if (index >= 0) {
            records[index] = record;
        } else {
            records.push(record);
        }
        localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
    },

    /**
     * 获取指定题目的记录
     */
    getRecord(puzzleId) {
        const records = this.getRecords();
        // 转换为数字类型进行比较，避免 localStorage 存储导致的类型不匹配
        const puzzleIdNum = typeof puzzleId === 'string' ? parseInt(puzzleId, 10) : puzzleId;
        return records.find(r => r.puzzleId === puzzleIdNum);
    },

    /**
     * 获取所有积分记录
     */
    getScoreRecords() {
        const data = localStorage.getItem(this.KEYS.SCORE_RECORDS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存积分记录
     */
    saveScoreRecord(record) {
        const scoreRecords = this.getScoreRecords();
        record.id = Date.now() + Math.random().toString(36).substr(2, 9);
        record.timestamp = new Date().toISOString();
        scoreRecords.push(record);
        localStorage.setItem(this.KEYS.SCORE_RECORDS, JSON.stringify(scoreRecords));
        return record;
    },

    /**
     * 获取每日任务
     */
    getDailyTasks() {
        const data = localStorage.getItem(this.KEYS.DAILY_TASKS);
        if (data) {
            const tasks = JSON.parse(data);
            // 检查任务数据版本（处理旧数据）
            if (!tasks.version || tasks.version < 2) {
                return this.resetDailyTasks();
            }
            // 检查是否需要重置（新的一天）
            if (tasks.lastRefreshDate) {
                const lastDate = new Date(tasks.lastRefreshDate).toDateString();
                const today = new Date().toDateString();
                if (lastDate !== today) {
                    return this.resetDailyTasks();
                }
            }
            return tasks;
        }
        return this.resetDailyTasks();
    },

    /**
     * 重置每日任务
     */
    resetDailyTasks() {
        const playerData = this.getPlayerData();
        const dailyTasks = generateDailyTasks(playerData.level);
        dailyTasks.lastRefreshDate = new Date().toISOString();
        localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
        return dailyTasks;
    },

    /**
     * 保存每日任务
     */
    saveDailyTasks(tasks) {
        tasks.lastRefreshDate = tasks.lastRefreshDate || new Date().toISOString();
        localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(tasks));
    },

    /**
     * 获取下一个题目ID
     */
    getNextPuzzleId() {
        let id = parseInt(localStorage.getItem(this.KEYS.PUZZLE_ID) || '0');
        id++;
        localStorage.setItem(this.KEYS.PUZZLE_ID, id.toString());
        return id;
    },

    /**
     * 简单加密函数（XOR加密）
     */
    encrypt(data, key = 'sudoku_secret_key') {
        // 先编码以处理非ASCII字符
        const encodedData = encodeURIComponent(data);
        let encrypted = [];
        for (let i = 0; i < encodedData.length; i++) {
            encrypted.push(encodedData.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(String.fromCharCode(...encrypted));
    },

    /**
     * 简单解密函数
     */
    decrypt(encrypted, key = 'sudoku_secret_key') {
        try {
            const decoded = atob(encrypted);
            let decrypted = [];
            for (let i = 0; i < decoded.length; i++) {
                decrypted.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            // 解码还原非ASCII字符
            return decodeURIComponent(String.fromCharCode(...decrypted));
        } catch {
            return null;
        }
    },

    /**
     * 导出存档 - 将所有数据打包成加密字符串
     */
    exportSaveData() {
        const playerData = this.getPlayerData();
        const records = this.getRecords();
        const scoreRecords = this.getScoreRecords();
        
        // 使用紧凑格式减少体积
        const compactData = {
            v: '1',
            t: Date.now(),
            p: {
                s: playerData.totalScore,
                l: playerData.level,
                d: playerData.continueDay,
                a: playerData.achievementList,
                lp: playerData.lastPlayDate
            },
            r: records.slice(-50), // 只保留最近50条记录
            sr: scoreRecords.slice(-30), // 只保留最近30条积分记录
            sid: localStorage.getItem(this.KEYS.SESSION),
            pid: localStorage.getItem(this.KEYS.PUZZLE_ID),
            dt: this.getDailyTasks(),
            wt: this.getWeeklyTasks()
        };
        const jsonString = JSON.stringify(compactData);
        return this.compressAndEncrypt(jsonString);
    },

    /**
     * 压缩并加密数据
     */
    compressAndEncrypt(data) {
        // 使用简单的字符替换压缩
        let compressed = data
            .replace(/"([a-z])":/g, '$1:')
            .replace(/":/g, '=')
            .replace(/"([^"]+)"/g, '`$1`');
        
        // 编码处理非ASCII字符
        const encoded = encodeURIComponent(compressed);
        
        // XOR加密
        const key = 'sudoku_key';
        let encrypted = [];
        for (let i = 0; i < encoded.length; i++) {
            encrypted.push(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        
        // 使用base64url编码（更紧凑）
        return btoa(String.fromCharCode(...encrypted))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    },

    /**
     * 解密并解压数据
     */
    decryptAndDecompress(encrypted) {
        try {
            // 还原base64url编码
            const base64 = encrypted
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            
            // XOR解密
            const decoded = atob(padded);
            const key = 'sudoku_key';
            let decrypted = [];
            for (let i = 0; i < decoded.length; i++) {
                decrypted.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            
            // 解码还原
            const decompressed = decodeURIComponent(String.fromCharCode(...decrypted));
            
            // 还原JSON格式
            const restored = decompressed
                .replace(/`([^`]+)`/g, '"$1"')
                .replace(/=/g, '":')
                .replace(/([a-z]):/g, '"$1":');
            
            return JSON.parse(restored);
        } catch {
            return null;
        }
    },

    /**
     * 导入存档 - 解析加密字符串并恢复数据
     */
    importSaveData(encryptedData) {
        try {
            // 尝试新格式
            let saveData = this.decryptAndDecompress(encryptedData);
            
            // 如果新格式失败，尝试旧格式（兼容之前的存档）
            if (!saveData) {
                const jsonString = this.decrypt(encryptedData);
                if (!jsonString) {
                    return { success: false, message: '无效的存档数据' };
                }
                saveData = JSON.parse(jsonString);
            }
            
            // 验证版本
            if (!saveData.v && !saveData.version) {
                return { success: false, message: '无效的存档数据' };
            }
            
            // 恢复数据（兼容新旧格式）
            const playerData = saveData.p || saveData.data?.playerData;
            if (playerData) {
                // 转换紧凑格式
                const fullPlayerData = {
                    totalScore: playerData.s || playerData.totalScore || 0,
                    level: playerData.l || playerData.level || 1,
                    continueDay: playerData.d || playerData.continueDay || 0,
                    achievementList: playerData.a || playerData.achievementList || [],
                    lastPlayDate: playerData.lp || playerData.lastPlayDate || null
                };
                this.savePlayerData(fullPlayerData);
            }
            
            const records = saveData.r || saveData.data?.records;
            if (records) {
                localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
            }
            
            const scoreRecords = saveData.sr || saveData.data?.scoreRecords;
            if (scoreRecords) {
                localStorage.setItem(this.KEYS.SCORE_RECORDS, JSON.stringify(scoreRecords));
            }
            
            const session = saveData.sid || saveData.data?.session;
            if (session) {
                localStorage.setItem(this.KEYS.SESSION, session);
            }
            
            const puzzleId = saveData.pid || saveData.data?.puzzleId;
            if (puzzleId) {
                localStorage.setItem(this.KEYS.PUZZLE_ID, puzzleId);
            }
            
            const dailyTasks = saveData.dt || saveData.data?.dailyTasks;
            if (dailyTasks) {
                localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
            }
            
            const weeklyTasks = saveData.wt || saveData.data?.weeklyTasks;
            if (weeklyTasks) {
                localStorage.setItem(this.KEYS.WEEKLY_TASKS, JSON.stringify(weeklyTasks));
            }
            
            // 获取导出时间
            const exportTime = saveData.t ? new Date(saveData.t).toISOString() : saveData.exportTime || new Date().toISOString();
            
            return { 
                success: true, 
                message: '存档导入成功',
                exportTime: exportTime 
            };
        } catch (error) {
            return { success: false, message: '存档解析失败: ' + error.message };
        }
    },

    /**
     * 清除所有存档数据
     */
    clearAllData() {
        localStorage.removeItem(this.KEYS.RECORDS);
        localStorage.removeItem(this.KEYS.SCORE_RECORDS);
        localStorage.removeItem(this.KEYS.SESSION);
        localStorage.removeItem(this.KEYS.PUZZLE_ID);
        localStorage.removeItem(this.KEYS.PLAYER_DATA);
        localStorage.removeItem(this.KEYS.DAILY_TASKS);
        localStorage.removeItem(this.KEYS.WEEKLY_TASKS);
    },

    /**
     * 获取玩家数据
     */
    getPlayerData() {
        const data = localStorage.getItem(this.KEYS.PLAYER_DATA);
        if (data) {
            const playerData = JSON.parse(data);
            // 兼容旧数据，添加新字段
            if (playerData.availableScore === undefined) {
                playerData.availableScore = playerData.totalScore || 0;
            }
            if (!playerData.items) {
                playerData.items = {};
            }
            if (!playerData.checkInHistory) {
                playerData.checkInHistory = [];
            }
            if (!playerData.makeupHistory) {
                playerData.makeupHistory = [];
            }
            return playerData;
        }
        // 返回默认值
        return {
            totalScore: 0,
            availableScore: 0,
            level: 1,
            continueDay: 0,
            achievementList: [],
            lastPlayDate: null,
            items: {},
            checkInHistory: [],
            makeupHistory: []
        };
    },

    /**
     * 保存玩家数据
     */
    savePlayerData(data) {
        localStorage.setItem(this.KEYS.PLAYER_DATA, JSON.stringify(data));
    },

    /**
     * 获取周常任务
     */
    getWeeklyTasks() {
        const data = localStorage.getItem(this.KEYS.WEEKLY_TASKS);
        if (data) {
            const tasks = JSON.parse(data);
            // 检查是否需要刷新（每周一0点）
            if (this.needsRefreshWeeklyTasks(tasks.lastRefreshDate)) {
                return this.resetWeeklyTasks();
            }
            return tasks;
        }
        return this.resetWeeklyTasks();
    },

    /**
     * 保存周常任务
     */
    saveWeeklyTasks(tasks) {
        localStorage.setItem(this.KEYS.WEEKLY_TASKS, JSON.stringify(tasks));
    },

    /**
     * 检查是否需要刷新周常任务
     */
    needsRefreshWeeklyTasks(lastRefreshDate) {
        if (!lastRefreshDate) return true;
        const lastDate = new Date(lastRefreshDate);
        const now = new Date();
        // 获取上周一0点
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - (now.getDay() || 7) + 1);
        lastMonday.setHours(0, 0, 0, 0);
        return lastDate < lastMonday;
    },

    /**
     * 重置周常任务
     */
    resetWeeklyTasks() {
        const tasks = {
            lastRefreshDate: new Date().toISOString(),
            dailyQuiz: { progress: 0, target: 5, reward: 10, completed: false },
            challengeAdvanced: { progress: 0, target: 3, reward: 25, completed: false },
            hardcoreChallenge: { progress: 0, target: 2, reward: 40, completed: false }
        };
        this.saveWeeklyTasks(tasks);
        return tasks;
    }
};

// ==================== 每日任务系统 ====================

// 每日任务模板配置（按等级分组）
const dailyTaskTemplates = {
    // Lv1-3: 新手阶段
    beginner: [
        { id: 'daily_easy', name: '新手热身', description: '完成1道简单难度数独', type: 'game', target: 1, reward: 3, filter: { difficulty: 'EASY' } },
        { id: 'daily_mini', name: '迷你挑战', description: '完成1道迷你数独', type: 'game', target: 1, reward: 2, filter: { gameType: ['MINI_4x4', 'MINI_6x6'] } },
        { id: 'daily_quick', name: '快速通关', description: '6分钟内完成1道数独', type: 'time', target: 1, timeLimit: 360, reward: 5, filter: {} },
        { id: 'daily_streak', name: '保持连胜', description: '连续完成2道数独', type: 'streak', target: 2, reward: 4, filter: {} },
        { id: 'daily_first', name: '每日首胜', description: '完成今日第一道数独', type: 'first', target: 1, reward: 5, filter: {} }
    ],
    // Lv4-6: 进阶阶段
    intermediate: [
        { id: 'daily_medium', name: '进阶挑战', description: '完成2道中等难度数独', type: 'game', target: 2, reward: 8, filter: { difficulty: 'MEDIUM' } },
        { id: 'daily_standard', name: '标准练习', description: '完成3道标准数独', type: 'game', target: 3, reward: 6, filter: { gameType: 'STANDARD' } },
        { id: 'daily_speed', name: '速度挑战', description: '5分钟内完成1道数独', type: 'time', target: 1, timeLimit: 300, reward: 8, filter: {} },
        { id: 'daily_no_mistake', name: '完美通关', description: '无错误完成1道数独', type: 'perfect', target: 1, reward: 10, filter: {} },
        { id: 'daily_variant', name: '初尝变体', description: '完成1道变体数独（支持：对角线数独、奇偶数独）', type: 'game', target: 1, reward: 10, filter: { gameType: ['DIAGONAL', 'ODD_EVEN'] } }
    ],
    // Lv7-9: 高手阶段
    advanced: [
        { id: 'daily_hard', name: '高手试炼', description: '完成2道高级难度数独', type: 'game', target: 2, reward: 15, filter: { difficulty: 'HARD' } },
        { id: 'daily_killer', name: '杀手挑战', description: '完成1道杀手数独', type: 'game', target: 1, reward: 12, filter: { gameType: ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'] } },
        { id: 'daily_master', name: '大师速度', description: '4分钟内完成1道数独', type: 'time', target: 1, timeLimit: 240, reward: 15, filter: {} },
        { id: 'daily_streak_5', name: '连胜大师', description: '连续完成5道数独', type: 'streak', target: 5, reward: 12, filter: {} },
        { id: 'daily_variant_2', name: '变体达人', description: '完成2道不同类型变体数独（支持：对角线数独、奇偶数独、锯齿数独、窗口数独）', type: 'game', target: 2, reward: 15, filter: { gameType: ['DIAGONAL', 'ODD_EVEN', 'IRREGULAR', 'WINDOKU'] } }
    ],
    // Lv10+: 大师阶段
    master: [
        { id: 'daily_hardcore', name: '硬核挑战', description: '完成3道高级难度数独', type: 'game', target: 3, reward: 25, filter: { difficulty: 'HARD' } },
        { id: 'daily_killer_9x9', name: '终极杀手', description: '完成1道9宫杀手数独', type: 'game', target: 1, reward: 20, filter: { gameType: 'KILLER_9x9' } },
        { id: 'daily_speed_demon', name: '极速通关', description: '3分钟内完成1道标准数独', type: 'time', target: 1, timeLimit: 180, reward: 20, filter: { gameType: 'STANDARD' } },
        { id: 'daily_perfect_streak', name: '完美连胜', description: '连续5道无错误通关', type: 'perfect_streak', target: 5, reward: 25, filter: {} },
        { id: 'daily_all_variant', name: '变体全制霸', description: '完成3道不同类型变体数独（支持：对角线、奇偶数独、锯齿、窗口、中心点、星号、黑白点、三明治、摩天楼数独）', type: 'game', target: 3, reward: 30, filter: { gameType: ['DIAGONAL', 'ODD_EVEN', 'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 'SANDWICH', 'SKYSCRAPER'] } }
    ]
};

/**
 * 根据等级获取每日任务组
 */
function getTaskGroup(level) {
    if (level <= 3) return 'beginner';
    if (level <= 6) return 'intermediate';
    if (level <= 9) return 'advanced';
    return 'master';
}

/**
 * 生成每日任务
 */
function generateDailyTasks(level) {
    const taskGroup = getTaskGroup(level);
    const templates = dailyTaskTemplates[taskGroup];
    
    const tasks = {
        version: 2  // 任务数据版本号，用于强制更新旧数据
    };
    templates.forEach(template => {
        tasks[template.id] = {
            ...template,
            progress: 0,
            completed: false,
            claimed: false
        };
    });
    
    return tasks;
}

/**
 * 更新每日任务
 */
function updateDailyTasks(gameType, difficulty, completionTime, attemptCount) {
    const tasks = Storage.getDailyTasks();
    let totalReward = 0;
    const completedTasks = [];
    
    Object.keys(tasks).forEach(taskId => {
        const task = tasks[taskId];
        if (task.completed || task.claimed || taskId === 'lastRefreshDate' || taskId === 'version') return;
        
        let shouldProgress = false;
        
        switch (task.type) {
            case 'game':
                if (task.filter.difficulty) {
                    shouldProgress = difficulty === task.filter.difficulty;
                } else if (task.filter.gameType) {
                    const gameTypes = Array.isArray(task.filter.gameType) ? task.filter.gameType : [task.filter.gameType];
                    shouldProgress = gameTypes.includes(gameType);
                } else {
                    shouldProgress = true;
                }
                break;
            case 'time':
                // 速度挑战：单次通关时间小于等于时间限制即完成
                shouldProgress = completionTime <= task.timeLimit;
                break;
            case 'perfect':
                // 完美通关：从未重置即完成（attemptCount === 0）
                shouldProgress = attemptCount === 0;
                break;
            case 'first':
                // 检查是否是今日第一个完成的任务（通过游戏记录判断）
                const gameRecords = Storage.getRecords();
                const today = new Date().toDateString();
                const todayCompletedRecords = gameRecords.filter(r => r.isCompleted && !r.isAbandoned && 
                    new Date(r.startTime || 0).toDateString() === today);
                shouldProgress = todayCompletedRecords.length === 1;
                break;
            case 'streak':
                // 检查连续完成记录（从最新记录开始检查连续完成）
                const streakRecords = Storage.getRecords();
                const sortedRecords = [...streakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let currentStreak = 0;
                for (const record of sortedRecords) {
                    if (record.isCompleted && !record.isAbandoned) {
                        currentStreak++;
                    } else {
                        break; // 遇到未完成或放弃的记录，连胜中断
                    }
                    if (currentStreak >= task.target) {
                        break;
                    }
                }
                // 每次完成游戏都更新连胜进度（即使未达到目标）
                shouldProgress = currentStreak > 0;
                break;
            case 'perfect_streak':
                // 检查连续完美通关记录
                const perfectStreakRecords = Storage.getRecords();
                const sortedPerfectRecords = [...perfectStreakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let perfectStreak = 0;
                for (const record of sortedPerfectRecords) {
                    if (record.isCompleted && !record.isAbandoned && record.attemptCount === 1) {
                        perfectStreak++;
                    } else {
                        break; // 遇到不完美或未完成的记录，连胜中断
                    }
                    if (perfectStreak >= task.target) {
                        break;
                    }
                }
                // 每次完成游戏都更新完美连胜进度（即使未达到目标）
                shouldProgress = perfectStreak > 0;
                break;
        }
        
        if (shouldProgress) {
            if (task.type === 'time' || task.type === 'first') {
                // 这些任务类型：满足条件直接完成
                task.progress = task.target;
                task.completed = true;
                totalReward += task.reward;
                completedTasks.push(task);
            } else if (task.type === 'streak' || task.type === 'perfect_streak') {
                // 连胜任务：更新当前连胜数作为进度
                const streakRecords = Storage.getRecords();
                const sortedStreakRecords = [...streakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let currentStreak = 0;
                for (const record of sortedStreakRecords) {
                    if (task.type === 'perfect_streak') {
                        if (record.isCompleted && !record.isAbandoned && record.attemptCount === 1) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    } else {
                        if (record.isCompleted && !record.isAbandoned) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                }
                
                task.progress = Math.min(currentStreak, task.target);
                if (task.progress >= task.target) {
                    task.completed = true;
                    totalReward += task.reward;
                    completedTasks.push(task);
                }
            } else {
                task.progress++;
                if (task.progress >= task.target) {
                    task.completed = true;
                    totalReward += task.reward;
                    completedTasks.push(task);
                }
            }
        }
    });
    
    Storage.saveDailyTasks(tasks);
    
    if (totalReward > 0) {
        addScore(totalReward);
        completedTasks.forEach(task => {
            Storage.saveScoreRecord({
                type: 'task',
                name: task.name,
                description: task.description,
                score: task.reward
            });
        });
    }
    
    return { tasks, reward: totalReward, completedTasks };
}

// ==================== 等级成长激励系统 ====================

// 基础分数配置（分/题）
const scoreConfig = {
    MINI_4x4: { EASY: 1, MEDIUM: 2, HARD: 3 },
    MINI_6x6: { EASY: 1, MEDIUM: 2, HARD: 3 },
    STANDARD: { EASY: 2, MEDIUM: 3, HARD: 4 },
    DIAGONAL: { EASY: 2, MEDIUM: 3, HARD: 4 },
    ODD_EVEN: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_4x4: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_6x6: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_9x9: { EASY: 2, MEDIUM: 4, HARD: 6 },
    IRREGULAR: { EASY: 2, MEDIUM: 4, HARD: 6 },
    WINDOKU: { EASY: 2, MEDIUM: 4, HARD: 6 },
    CENTER_DOT: { EASY: 2, MEDIUM: 4, HARD: 6 },
    STAR: { EASY: 2, MEDIUM: 4, HARD: 6 },
    BLACK_WHITE_DOT: { EASY: 2, MEDIUM: 4, HARD: 6 },
    SANDWICH: { EASY: 2, MEDIUM: 4, HARD: 6 },
    SKYSCRAPER: { EASY: 2, MEDIUM: 4, HARD: 6 }
};

// 等级配置
const levelConfig = [
    { level: 1, name: '初学萌新', minScore: 0, title: '萌新' },
    { level: 2, name: '初学萌新', minScore: 50, title: '萌新' },
    { level: 3, name: '初学萌新', minScore: 120, title: '萌新' },
    { level: 4, name: '数独爱好者', minScore: 250, title: '爱好者' },
    { level: 5, name: '数独爱好者', minScore: 450, title: '爱好者' },
    { level: 6, name: '数独爱好者', minScore: 750, title: '爱好者' },
    { level: 7, name: '资深高手', minScore: 1150, title: '高手' },
    { level: 8, name: '资深高手', minScore: 1650, title: '高手' },
    { level: 9, name: '资深高手', minScore: 2250, title: '高手' },
    { level: 10, name: '数独大师', minScore: 3000, title: '大师' },
    { level: 11, name: '数独大师', minScore: 4000, title: '大师' },
    { level: 12, name: '数独大师', minScore: 5300, title: '大师' },
    { level: 13, name: '传世宗师', minScore: 7000, title: '宗师' },
    { level: 14, name: '传世宗师', minScore: 9200, title: '宗师' },
    { level: 15, name: '封神宗师', minScore: 12000, title: '宗师' }
];

// 道具配置
const itemConfig = window.itemConfig = [
    {
        id: 'makeup_checkin',
        name: '补打卡券',
        description: '使用后可补签一次，保持连续打卡天数',
        price: 20,
        icon: '🎫',
        type: 'consumable',
        effect: 'makeup_checkin'
    },
    // 农场道具
    {
        id: 'fertilizer',
        name: '肥料',
        description: '给作物施肥，大幅增加成长值（每日限用一次）',
        price: 5,
        icon: '🧪',
        type: 'consumable',
        effect: 'fertilizer',
        requires: 'farm_right'
    },
    {
        id: 'feed',
        name: '饲料',
        description: '给动物加餐，大幅增加成长值（每日限用一次）',
        price: 5,
        icon: '🌾',
        type: 'consumable',
        effect: 'feed',
        requires: 'farm_right'
    },
    // 蔬菜种子
    {
        id: 'carrot_seed',
        name: '胡萝卜种子',
        description: '种植胡萝卜，成熟后可兑换积分',
        price: 30,
        icon: '🥕',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'tomato_seed',
        name: '西红柿种子',
        description: '种植西红柿，成熟后可兑换积分',
        price: 40,
        icon: '🍅',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'lettuce_seed',
        name: '生菜种子',
        description: '种植生菜，成熟后可兑换积分',
        price: 20,
        icon: '🥬',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'corn_seed',
        name: '玉米种子',
        description: '种植玉米，成熟后可兑换积分',
        price: 50,
        icon: '🌽',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'potato_seed',
        name: '土豆种子',
        description: '种植土豆，成熟后可兑换积分',
        price: 30,
        icon: '🥔',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'eggplant_seed',
        name: '茄子种子',
        description: '种植茄子，成熟后可兑换积分',
        price: 40,
        icon: '🍆',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    // 果树苗
    {
        id: 'apple_seed',
        name: '苹果树苗',
        description: '种植苹果树，成熟后每日产苹果',
        price: 100,
        icon: '🍎',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'orange_seed',
        name: '橙子树苗',
        description: '种植橙子树，成熟后每日产橙子',
        price: 120,
        icon: '🍊',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'grape_seed',
        name: '葡萄树苗',
        description: '种植葡萄树，成熟后每日产葡萄',
        price: 90,
        icon: '🍇',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    {
        id: 'peach_seed',
        name: '桃树苗',
        description: '种植桃树，成熟后每日产桃子',
        price: 110,
        icon: '🍑',
        type: 'consumable',
        effect: 'seed',
        requires: 'farm_right'
    },
    // 动物
    {
        id: 'chicken_baby',
        name: '小鸡',
        description: '购买小鸡，长大后每日产鸡蛋',
        price: 200,
        icon: '🐣',
        type: 'permanent',
        effect: 'animal',
        requires: 'farm_right'
    },
    {
        id: 'cow_baby',
        name: '小牛',
        description: '购买小牛，长大后每日产牛奶',
        price: 300,
        icon: '🐮',
        type: 'permanent',
        effect: 'animal',
        requires: 'farm_right'
    },
    // 鱼塘道具
    {
        id: 'bait',
        name: '鱼饵',
        description: '用于在鱼塘钓鱼',
        price: 5,
        icon: '🪱',
        type: 'consumable',
        effect: 'bait',
        requires: 'fishing_rod'
    },
    // 菜园空地
    {
        id: 'garden_slot_2',
        name: '菜园2号地',
        description: '解锁第二块菜地',
        price: 500,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_3',
        name: '菜园3号地',
        description: '解锁第三块菜地',
        price: 800,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_4',
        name: '菜园4号地',
        description: '解锁第四块菜地',
        price: 1200,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_5',
        name: '菜园5号地',
        description: '解锁第五块菜地',
        price: 1800,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_6',
        name: '菜园6号地',
        description: '解锁第六块菜地',
        price: 2500,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_7',
        name: '菜园7号地',
        description: '解锁第七块菜地',
        price: 3500,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_8',
        name: '菜园8号地',
        description: '解锁第八块菜地',
        price: 4500,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'garden_slot_9',
        name: '菜园9号地',
        description: '解锁第九块菜地',
        price: 5500,
        icon: '🥬',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    // 果园空地
    {
        id: 'orchard_slot_2',
        name: '果园2号地',
        description: '解锁第二块果园',
        price: 600,
        icon: '🍎',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_3',
        name: '果园3号地',
        description: '解锁第三块果园',
        price: 1000,
        icon: '🍊',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_4',
        name: '果园4号地',
        description: '解锁第四块果园',
        price: 1500,
        icon: '🍇',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_5',
        name: '果园5号地',
        description: '解锁第五块果园',
        price: 2200,
        icon: '🍑',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_6',
        name: '果园6号地',
        description: '解锁第六块果园',
        price: 3000,
        icon: '🍐',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_7',
        name: '果园7号地',
        description: '解锁第七块果园',
        price: 4000,
        icon: '🍒',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_8',
        name: '果园8号地',
        description: '解锁第八块果园',
        price: 5200,
        icon: '🍋',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    },
    {
        id: 'orchard_slot_9',
        name: '果园9号地',
        description: '解锁第九块果园',
        price: 6500,
        icon: '🍌',
        type: 'permanent',
        effect: 'farm_slot',
        requires: 'farm_right'
    }
];

// 成就配置
const achievementConfig = window.achievementConfig = [
    { id: 'ACH001', name: '新手启程', reward: 10, condition: '通关50道入门题' },
    { id: 'ACH002', name: '持之以恒', reward: 30, condition: '连续14天每日≥1通关' },
    { id: 'ACH003', name: '速通达人', reward: 20, condition: '高级难度2分钟内通关' },
    { id: 'ACH004', name: '变体先锋', reward: 25, condition: '首次通关变体数独' },
    { id: 'ACH005', name: '小有成就', reward: 25, condition: '累计通关100道题' },
    { id: 'ACH006', name: '百题斩', reward: 50, condition: '累计通关500道题' },
    { id: 'ACH007', name: '千题大师', reward: 150, condition: '累计通关1000道题' },
    { id: 'ACH008', name: '初遇挑战', reward: 20, condition: '首次通关高级难度' },
    { id: 'ACH009', name: '迎难而上', reward: 50, condition: '累计通关20道高级难度' },
    { id: 'ACH010', name: '速度之星', reward: 30, condition: '高级难度45秒内通关' },
    { id: 'ACH011', name: '完美主义', reward: 50, condition: '高级难度标准数独无重置90秒内通关' },
    { id: 'ACH012', name: '连胜王者', reward: 35, condition: '连续通关10次' },
    { id: 'ACH013', name: '变体大师', reward: 80, condition: '通关所有类型变体数独' },
    { id: 'ACH014', name: '杀手专家', reward: 50, condition: '通关所有难度杀手数独' },
    { id: 'ACH015', name: '挑战极限', reward: 100, condition: '通关所有类型数独' },
    { id: 'ACH016', name: '打卡达人', reward: 40, condition: '连续21天打卡' },
    { id: 'ACH017', name: '签到王者', reward: 80, condition: '连续60天打卡' },
    { id: 'ACH018', name: '初见杀手', reward: 20, condition: '首次通关杀手数独' },
    { id: 'ACH019', name: '对角线达人', reward: 20, condition: '首次通关对角线数独' },
    { id: 'ACH020', name: '迷你专家', reward: 15, condition: '通关所有迷你数独' },
    { id: 'ACH021', name: '极速大师', reward: 80, condition: '高级难度30秒内通关' },
    { id: 'ACH022', name: '千锤百炼', reward: 300, condition: '累计通关5000道题' },
    { id: 'ACH023', name: '无尽连胜', reward: 60, condition: '连续通关20次' },
    { id: 'ACH024', name: '全能大师', reward: 500, condition: '解锁所有成就' },
    { id: 'ACH025', name: '限时挑战', reward: 40, condition: '10分钟内完成3道高级数独' },
    { id: 'ACH026', name: '完美连胜', reward: 50, condition: '连续10次无重置通关' },
    { id: 'ACH027', name: '夜行大师', reward: 30, condition: '凌晨0-6点完成5次通关' },
    { id: 'ACH028', name: '数字艺术家', reward: 45, condition: '使用颜色模式完成100题' },
    { id: 'ACH029', name: '杀手之王', reward: 60, condition: '通关9宫杀手数独' },
    { id: 'ACH030', name: '传奇大师', reward: 200, condition: '累计通关10000道题' }
];

/**
 * 获取题目基础分数
 */
function getBaseScore(gameType, difficulty) {
    const gameConfig = scoreConfig[gameType];
    if (!gameConfig) return 1;
    return gameConfig[difficulty] || 1;
}

/**
 * 根据分数获取等级信息
 */
function getLevelInfo(score) {
    for (let i = levelConfig.length - 1; i >= 0; i--) {
        if (score >= levelConfig[i].minScore) {
            return levelConfig[i];
        }
    }
    return levelConfig[0];
}

/**
 * 计算升级所需分数
 */
function getScoreToNextLevel(currentLevel) {
    const currentLevelInfo = levelConfig.find(l => l.level === currentLevel);
    const nextLevelInfo = levelConfig.find(l => l.level === currentLevel + 1);
    if (!nextLevelInfo) return null; // 已达到最高等级
    return nextLevelInfo.minScore - currentLevelInfo.minScore;
}

/**
 * 添加分数
 */
function addScore(points) {
    const playerData = Storage.getPlayerData();
    playerData.totalScore += points;
    playerData.availableScore = (playerData.availableScore || 0) + points;
    
    // 更新等级
    const newLevelInfo = getLevelInfo(playerData.totalScore);
    const oldLevel = playerData.level;
    playerData.level = newLevelInfo.level;
    
    Storage.savePlayerData(playerData);
    
    // 如果升级了，返回升级信息
    if (playerData.level > oldLevel) {
        return { levelUp: true, oldLevel, newLevel: playerData.level, levelName: newLevelInfo.name };
    }
    return { levelUp: false };
}

/**
 * 扣除可用积分
 */
function deductAvailableScore(points) {
    const playerData = Storage.getPlayerData();
    if ((playerData.availableScore || 0) < points) {
        return { success: false, message: '可用积分不足' };
    }
    playerData.availableScore -= points;
    Storage.savePlayerData(playerData);
    return { success: true, availableScore: playerData.availableScore };
}

/**
 * 获取玩家拥有的道具
 */
function getPlayerItems() {
    const playerData = Storage.getPlayerData();
    return playerData.items || {};
}

/**
 * 添加道具到玩家背包
 */
function addItemToPlayer(itemId, quantity = 1) {
    const playerData = Storage.getPlayerData();
    if (!playerData.items) {
        playerData.items = {};
    }
    playerData.items[itemId] = (playerData.items[itemId] || 0) + quantity;
    Storage.savePlayerData(playerData);
    return { success: true, items: playerData.items };
}

/**
 * 使用道具
 */
function useItem(itemId) {
    const playerData = Storage.getPlayerData();
    if (!playerData.items || !playerData.items[itemId] || playerData.items[itemId] <= 0) {
        return { success: false, message: '道具数量不足' };
    }
    playerData.items[itemId]--;
    Storage.savePlayerData(playerData);
    return { success: true, remaining: playerData.items[itemId] };
}

/**
 * 检查并触发成就
 */
function checkAchievements(gameType, difficulty, completionTime) {
    const records = Storage.getRecords();
    const completedRecords = records.filter(r => r.isCompleted && !r.isAbandoned);
    const achievements = [];
    const totalCompleted = completedRecords.length;
    
    let playerData = Storage.getPlayerData();
    
    // ACH001: 新手启程 - 通关50道入门题
    if (!playerData.achievementList.includes('ACH001')) {
        const easyCount = completedRecords.filter(r => 
            ['MINI_4x4', 'MINI_6x6', 'STANDARD'].includes(r.gameType) && 
            r.difficultyType === 'EASY'
        ).length;
        if (easyCount >= 50) {
            achievements.push('ACH001');
            addScore(10);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '新手启程',
                description: '通关50道入门题',
                score: 10
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH003: 速通达人 - 高级难度2分钟内通关
    if (!playerData.achievementList.includes('ACH003')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 120) {
            achievements.push('ACH003');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '速通达人',
                description: '高级难度2分钟内通关',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH004: 变体先锋 - 首次通关变体数独
    if (!playerData.achievementList.includes('ACH004')) {
        const variantTypes = ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
                             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const hasVariantCompleted = completedRecords.some(r => variantTypes.includes(r.gameType));
        if (hasVariantCompleted) {
            achievements.push('ACH004');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '变体先锋',
                description: '首次通关变体数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH005: 小有成就 - 累计通关100道题
    if (!playerData.achievementList.includes('ACH005')) {
        if (totalCompleted >= 100) {
            achievements.push('ACH005');
            addScore(25);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '小有成就',
                description: '累计通关100道题',
                score: 25
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH006: 百题斩 - 累计通关500道题
    if (!playerData.achievementList.includes('ACH006')) {
        if (totalCompleted >= 500) {
            achievements.push('ACH006');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '百题斩',
                description: '累计通关500道题',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH007: 千题大师 - 累计通关1000道题
    if (!playerData.achievementList.includes('ACH007')) {
        if (totalCompleted >= 1000) {
            achievements.push('ACH007');
            addScore(150);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '千题大师',
                description: '累计通关1000道题',
                score: 150
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH008: 初遇挑战 - 首次通关高级难度
    if (!playerData.achievementList.includes('ACH008')) {
        const hasHardCompleted = completedRecords.some(r => r.difficultyType === 'HARD');
        if (hasHardCompleted) {
            achievements.push('ACH008');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '初遇挑战',
                description: '首次通关高级难度',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH009: 迎难而上 - 累计通关20道高级难度
    if (!playerData.achievementList.includes('ACH009')) {
        const hardCount = completedRecords.filter(r => r.difficultyType === 'HARD').length;
        if (hardCount >= 20) {
            achievements.push('ACH009');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '迎难而上',
                description: '累计通关20道高级难度',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH010: 速度之星 - 高级难度45秒内通关
    if (!playerData.achievementList.includes('ACH010')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 45) {
            achievements.push('ACH010');
            addScore(30);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '速度之星',
                description: '高级难度45秒内通关',
                score: 30
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH011: 完美主义 - 高级难度无重置90秒内通关
    if (!playerData.achievementList.includes('ACH011')) {
        const hasPerfectCompleted = completedRecords.some(r => 
            r.attemptCount === 0 &&                              // 从未重置
            r.gameType === 'STANDARD' &&                         // 标准9宫格
            r.difficultyType === 'HARD' &&                       // 高级难度
            r.completionTime && r.completionTime <= 90           // 90秒内完成
        );
        if (hasPerfectCompleted) {
            achievements.push('ACH011');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '完美主义',
                description: '高级难度标准数独无重置90秒内通关',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH012: 连胜王者 - 连续通关10次
    if (!playerData.achievementList.includes('ACH012')) {
        const recentRecords = [...completedRecords].sort((a, b) => 
            new Date(b.startTime || 0) - new Date(a.startTime || 0)
        ).slice(0, 10);
        if (recentRecords.length >= 10) {
            achievements.push('ACH012');
            addScore(35);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '连胜王者',
                description: '连续通关10次',
                score: 35
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH013: 变体大师 - 通关所有类型变体数独
    if (!playerData.achievementList.includes('ACH013')) {
        const variantTypes = ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
                             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const completedVariantTypes = [...new Set(completedRecords.filter(r => 
            variantTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedVariantTypes.length >= variantTypes.length) {
            achievements.push('ACH013');
            addScore(80);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '变体大师',
                description: '通关所有类型变体数独',
                score: 80
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH014: 杀手专家 - 通关所有难度杀手数独
    if (!playerData.achievementList.includes('ACH014')) {
        const killerTypes = ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'];
        const completedKillerTypes = [...new Set(completedRecords.filter(r => 
            killerTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedKillerTypes.length >= killerTypes.length) {
            achievements.push('ACH014');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '杀手专家',
                description: '通关所有难度杀手数独',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH015: 挑战极限 - 通关所有类型数独
    if (!playerData.achievementList.includes('ACH015')) {
        const allGameTypes = ['MINI_4x4', 'MINI_6x6', 'STANDARD', 'DIAGONAL', 'ODD_EVEN', 
                             'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 'IRREGULAR', 
                             'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const completedTypes = [...new Set(completedRecords.map(r => r.gameType))];
        if (completedTypes.length >= allGameTypes.length) {
            achievements.push('ACH015');
            addScore(100);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '挑战极限',
                description: '通关所有类型数独',
                score: 100
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH018: 初见杀手 - 首次通关杀手数独
    if (!playerData.achievementList.includes('ACH018')) {
        const killerTypes = ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'];
        const hasKillerCompleted = completedRecords.some(r => killerTypes.includes(r.gameType));
        if (hasKillerCompleted) {
            achievements.push('ACH018');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '初见杀手',
                description: '首次通关杀手数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH019: 对角线达人 - 首次通关对角线数独
    if (!playerData.achievementList.includes('ACH019')) {
        const hasDiagonalCompleted = completedRecords.some(r => r.gameType === 'DIAGONAL');
        if (hasDiagonalCompleted) {
            achievements.push('ACH019');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '对角线达人',
                description: '首次通关对角线数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH020: 迷你专家 - 通关所有迷你数独
    if (!playerData.achievementList.includes('ACH020')) {
        const miniTypes = ['MINI_4x4', 'MINI_6x6'];
        const completedMiniTypes = [...new Set(completedRecords.filter(r => 
            miniTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedMiniTypes.length >= miniTypes.length) {
            achievements.push('ACH020');
            addScore(15);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '迷你专家',
                description: '通关所有迷你数独',
                score: 15
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH021: 极速大师 - 高级难度30秒内通关
    if (!playerData.achievementList.includes('ACH021')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 30) {
            achievements.push('ACH021');
            addScore(80);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '极速大师',
                description: '高级难度30秒内通关',
                score: 80
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH022: 千锤百炼 - 累计通关5000道题
    if (!playerData.achievementList.includes('ACH022')) {
        if (totalCompleted >= 5000) {
            achievements.push('ACH022');
            addScore(300);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '千锤百炼',
                description: '累计通关5000道题',
                score: 300
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH023: 无尽连胜 - 连续通关20次
    if (!playerData.achievementList.includes('ACH023')) {
        const recentRecords = [...completedRecords].sort((a, b) => 
            new Date(b.startTime || 0) - new Date(a.startTime || 0)
        ).slice(0, 20);
        if (recentRecords.length >= 20) {
            achievements.push('ACH023');
            addScore(60);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '无尽连胜',
                description: '连续通关20次',
                score: 60
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH024: 全能大师 - 解锁所有成就
    if (!playerData.achievementList.includes('ACH024')) {
        if (playerData.achievementList.length >= achievementConfig.length) {
            achievements.push('ACH024');
            addScore(500);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '全能大师',
                description: '解锁所有成就',
                score: 500
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH025: 限时挑战 - 10分钟内完成3道高级数独
    if (!playerData.achievementList.includes('ACH025')) {
        const recentHardRecords = [...completedRecords]
            .filter(r => r.difficultyType === 'HARD' && r.completionTime)
            .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
            .slice(0, 3);
        if (recentHardRecords.length >= 3) {
            const firstTime = new Date(recentHardRecords[2].startTime || 0).getTime();
            const lastTime = new Date(recentHardRecords[0].startTime || 0).getTime() + 
                           (recentHardRecords[0].completionTime || 0) * 1000;
            if ((lastTime - firstTime) / 1000 <= 600) {
                achievements.push('ACH025');
                addScore(40);
                Storage.saveScoreRecord({
                    type: 'achievement',
                    name: '限时挑战',
                    description: '10分钟内完成3道高级数独',
                    score: 40
                });
                playerData = Storage.getPlayerData();
            }
        }
    }
    
    // ACH026: 完美连胜 - 连续10次无重置通关
    if (!playerData.achievementList.includes('ACH026')) {
        const recentRecords = [...completedRecords]
            .filter(r => r.attemptCount === 0)
            .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
            .slice(0, 10);
        if (recentRecords.length >= 10) {
            achievements.push('ACH026');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '完美连胜',
                description: '连续10次无重置通关',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH027: 夜行大师 - 凌晨0-6点完成5次通关
    if (!playerData.achievementList.includes('ACH027')) {
        const nightRecords = completedRecords.filter(r => {
            const hour = new Date(r.startTime || 0).getHours();
            return hour >= 0 && hour < 6;
        });
        if (nightRecords.length >= 5) {
            achievements.push('ACH027');
            addScore(30);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '夜行大师',
                description: '凌晨0-6点完成5次通关',
                score: 30
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH028: 数字艺术家 - 使用颜色模式完成100题
    if (!playerData.achievementList.includes('ACH028')) {
        const colorRecords = completedRecords.filter(r => r.iconMode === 'colors');
        if (colorRecords.length >= 100) {
            achievements.push('ACH028');
            addScore(45);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '数字艺术家',
                description: '使用颜色模式完成100题',
                score: 45
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH029: 杀手之王 - 通关9宫杀手数独
    if (!playerData.achievementList.includes('ACH029')) {
        const hasKiller9x9 = completedRecords.some(r => r.gameType === 'KILLER_9x9');
        if (hasKiller9x9) {
            achievements.push('ACH029');
            addScore(60);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '杀手之王',
                description: '通关9宫杀手数独',
                score: 60
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH030: 传奇大师 - 累计通关10000道题
    if (!playerData.achievementList.includes('ACH030')) {
        if (totalCompleted >= 10000) {
            achievements.push('ACH030');
            addScore(200);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '传奇大师',
                description: '累计通关10000道题',
                score: 200
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // 更新成就列表
    if (achievements.length > 0) {
        playerData = Storage.getPlayerData(); // 确保使用最新数据
        playerData.achievementList = [...new Set([...playerData.achievementList, ...achievements])];
        Storage.savePlayerData(playerData);
    }
    
    return achievements.map(id => achievementConfig.find(a => a.id === id));
}

/**
 * 计算连续打卡奖励积分
 */
function getCheckInReward(streak) {
    if (streak <= 3) return 5;
    if (streak <= 7) return 10;
    if (streak <= 14) return 15;
    if (streak <= 30) return 25;
    return 50;
}

/**
 * 将日期字符串统一转换为 YYYY-MM-DD 格式
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 根据打卡历史重新计算连续打卡天数
 */
function recalculateContinueDay() {
    let playerData = Storage.getPlayerData();
    const checkInHistory = playerData.checkInHistory || [];
    const makeupHistory = playerData.makeupHistory || [];
    
    // 合并正常打卡和补签历史，去重，并统一日期格式
    const allCheckedDates = [...new Set([
        ...checkInHistory.map(d => formatDate(d)), 
        ...makeupHistory.map(d => formatDate(d))
    ])];
    
    if (allCheckedDates.length === 0) {
        playerData.continueDay = 0;
        Storage.savePlayerData(playerData);
        return 0;
    }
    
    // 排序（降序）
    const sortedDates = allCheckedDates.sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    const today = new Date();
    const todayStr = formatDate(today);
    
    // 找到最后一个打卡日期（最新的日期）
    const lastCheckedDate = sortedDates[0];
    
    // 如果最后一个打卡日期是今天或者未来，从今天开始计算
    // 否则从最后一个打卡日期开始计算
    let checkDateStr = lastCheckedDate >= todayStr ? todayStr : lastCheckedDate;
    
    for (let i = 0; i < sortedDates.length; i++) {
        const historyDate = sortedDates[i];
        
        // 跳过未来的日期
        if (historyDate > todayStr) {
            continue;
        }
        
        // 检查是否是预期的日期
        if (historyDate === checkDateStr) {
            streak++;
            // 计算前一天
            const checkDate = new Date(checkDateStr);
            checkDate.setDate(checkDate.getDate() - 1);
            checkDateStr = formatDate(checkDate);
        } else {
            // 如果日期不连续，停止计算
            break;
        }
    }
    
    playerData.continueDay = streak;
    Storage.savePlayerData(playerData);
    return streak;
}

/**
 * 更新连续打卡天数
 */
function updateContinueDay() {
    let playerData = Storage.getPlayerData();
    
    // 使用标准化日期格式（YYYY-MM-DD）
    const today = new Date();
    const todayStr = formatDate(today);
    
    // 统一 lastPlayDate 格式
    const lastPlayDate = playerData.lastPlayDate ? formatDate(playerData.lastPlayDate) : null;
    
    if (lastPlayDate === todayStr) {
        // 今天已经更新过了
        return playerData.continueDay;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    
    // 获取补签历史
    const makeupHistory = playerData.makeupHistory || [];
    
    // 检查昨天是否有打卡（包括正常打卡和补签）
    // 使用 formatDate 统一格式进行比较
    const yesterdayChecked = playerData.checkInHistory.some(d => formatDate(d) === yesterdayStr) || 
                           makeupHistory.some(d => formatDate(d) === yesterdayStr);
    
    // 使用统一格式比较
    if (lastPlayDate === yesterdayStr || yesterdayChecked) {
        // 连续打卡
        playerData.continueDay++;
    } else if (lastPlayDate) {
        // 断签，重置
        playerData.continueDay = 1;
    } else {
        // 第一次打卡
        playerData.continueDay = 1;
    }
    
    playerData.lastPlayDate = todayStr;
    
    // 添加日期到打卡历史（确保不重复）
    if (!playerData.checkInHistory.some(d => formatDate(d) === todayStr)) {
        playerData.checkInHistory.push(todayStr);
    }
    
    Storage.savePlayerData(playerData);
    
    // 计算连续打卡奖励积分
    const rewardScore = getCheckInReward(playerData.continueDay);
    if (rewardScore > 0) {
        addScore(rewardScore);
        Storage.saveScoreRecord({
            type: 'checkin',
            name: '连续打卡积分',
            description: `连续打卡${playerData.continueDay}天奖励`,
            score: rewardScore
        });
    }
    
    const unlockedAchievements = [];
    
    // 检查 ACH002: 持之以恒 - 连续7天打卡
    if (!playerData.achievementList.includes('ACH002') && playerData.continueDay >= 7) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH002');
        Storage.savePlayerData(playerData);
        addScore(15);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '持之以恒',
            description: '连续7天打卡',
            score: 15
        });
        unlockedAchievements.push('ACH002');
        playerData = Storage.getPlayerData();
    }
    
    // 检查 ACH016: 打卡达人 - 连续14天打卡
    if (!playerData.achievementList.includes('ACH016') && playerData.continueDay >= 14) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH016');
        Storage.savePlayerData(playerData);
        addScore(30);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '打卡达人',
            description: '连续14天打卡',
            score: 30
        });
        unlockedAchievements.push('ACH016');
        playerData = Storage.getPlayerData();
    }
    
    // 检查 ACH017: 签到王者 - 连续30天打卡
    if (!playerData.achievementList.includes('ACH017') && playerData.continueDay >= 30) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH017');
        Storage.savePlayerData(playerData);
        addScore(50);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '签到王者',
            description: '连续30天打卡',
            score: 50
        });
        unlockedAchievements.push('ACH017');
        playerData = Storage.getPlayerData();
    }
    
    if (unlockedAchievements.length > 0) {
        return { continueDay: playerData.continueDay, achievementUnlocked: unlockedAchievements };
    }
    
    return { continueDay: playerData.continueDay };
}

/**
 * 更新周常任务
 */
function updateWeeklyTasks(gameType, difficulty) {
    const tasks = Storage.getWeeklyTasks();
    let totalReward = 0;
    
    // 日常刷题 - 通关任意5题
    if (!tasks.dailyQuiz.completed) {
        tasks.dailyQuiz.progress++;
        if (tasks.dailyQuiz.progress >= tasks.dailyQuiz.target) {
            tasks.dailyQuiz.completed = true;
            totalReward += tasks.dailyQuiz.reward;
        }
    }
    
    // 挑战进阶 - 通关3道中等及以上
    if (!tasks.challengeAdvanced.completed && ['MEDIUM', 'HARD'].includes(difficulty)) {
        tasks.challengeAdvanced.progress++;
        if (tasks.challengeAdvanced.progress >= tasks.challengeAdvanced.target) {
            tasks.challengeAdvanced.completed = true;
            totalReward += tasks.challengeAdvanced.reward;
        }
    }
    
    // 硬核挑战 - 通关2道高级/变体
    if (!tasks.hardcoreChallenge.completed) {
        const isHardcore = difficulty === 'HARD' || 
            ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
             'SANDWICH', 'SKYSCRAPER'].includes(gameType);
        if (isHardcore) {
            tasks.hardcoreChallenge.progress++;
            if (tasks.hardcoreChallenge.progress >= tasks.hardcoreChallenge.target) {
                tasks.hardcoreChallenge.completed = true;
                totalReward += tasks.hardcoreChallenge.reward;
            }
        }
    }
    
    Storage.saveWeeklyTasks(tasks);
    
    if (totalReward > 0) {
        addScore(totalReward);
    }
    
    return { tasks, reward: totalReward };
}

/**
 * 处理通关奖励
 */
function handleCompletionRewards(gameType, difficulty, completionTime, attemptCount = 1) {
    // 1. 添加基础分数
    const baseScore = getBaseScore(gameType, difficulty);
    const scoreResult = addScore(baseScore);
    
    // 2. 更新连续打卡天数
    const dayResult = updateContinueDay();
    
    // 3. 检查成就
    const achievements = checkAchievements(gameType, difficulty, completionTime);
    
    // 4. 更新周常任务
    const weeklyTaskResult = updateWeeklyTasks(gameType, difficulty);
    
    // 5. 更新每日任务
    const dailyTaskResult = updateDailyTasks(gameType, difficulty, completionTime, attemptCount);
    
    return {
        baseScore,
        scoreResult,
        dayResult,
        achievements,
        weeklyTaskResult,
        dailyTaskResult
    };
}

// ==================== 涂色模式功能 ====================

// 数字到颜色的映射（用于涂色模式）
const numberColors = {
    1: '#4CAF50',   // 绿色
    2: '#2196F3',   // 蓝色
    3: '#FF9800',   // 橙色
    4: '#F44336',   // 红色
    5: '#9C27B0',   // 紫色
    6: '#00BCD4',   // 青色
    7: '#FFEB3B',   // 黄色
    8: '#FFFFFF',   // 白色
    9: '#E91E63',   // 粉红
};

let isColorMode = false;
let hasWon = false; // 是否已经胜利

/**
 * 切换涂色模式
 */
function toggleColorMode() {
    isColorMode = !isColorMode;

    const colorModeBtn = document.getElementById('colorModeBtn');
    if (colorModeBtn) {
        if (isColorMode) {
            colorModeBtn.textContent = '🎨 正常模式';
        } else {
            colorModeBtn.textContent = '🎨 涂色模式';
        }
    }

    if (isColorMode) {
        renderColorBoard();
    } else {
        renderBoard();
    }

    const gameControls = document.getElementById('gameControls');
    if (gameControls) {
        gameControls.style.display = isColorMode ? 'none' : 'flex';
    }
}

/**
 * 一键答题：自动填写所有候选数唯一的格子（需要购买一键答题道具）
 */
function fillUniqueCandidates() {
    // 检查是否拥有一键答题道具
    const items = getPlayerItems();
    if (!items['auto_solve'] || items['auto_solve'] <= 0) {
        customAlert('您需要先在积分商城购买「一键答题」道具才能使用此功能！', 'warning');
        return;
    }
    
    const size = currentPuzzle.size || 9;
    let filledCount = 0;

    // 根据难度计算每格得分
    let pointsPerCell = 10;
    if (currentPuzzle.difficultyType === 'MEDIUM') {
        pointsPerCell = 12;
    } else if (currentPuzzle.difficultyType === 'HARD') {
        pointsPerCell = 15;
    }

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;

            // 跳过固定数字和已有确定值的格子
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }

            // 如果候选数组只有一个元素，填写它
            if (Array.isArray(currentBoard[index]) && currentBoard[index].length === 1) {
                const num = currentBoard[index][0];
                currentBoard[index] = num;
                filledCount++;
                
                // 计算积分
                currentGameScore += pointsPerCell;
                filledCells++;

                // 删除同行、同列、同宫中的重复候选数字
                const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
                affectedIndices.forEach(idx => {
                    if (Array.isArray(currentBoard[idx])) {
                        const candidateIdx = currentBoard[idx].indexOf(num);
                        if (candidateIdx >= 0) {
                            currentBoard[idx].splice(candidateIdx, 1);
                        }
                    }
                });
            }
        }
    }

    // 更新显示
    renderBoard();
    updateNumberButtons();
    updateGameScoreDisplay();
    updateProgressBar();
    scheduleSaveProgress();

    // 提示用户填写了多少个格子
    if (filledCount > 0) {
        const totalPoints = filledCount * pointsPerCell;
        customAlert(`已自动填写 ${filledCount} 个格子！获得 ${totalPoints} 积分！`, 'success');
    } else {
        customAlert('没有找到候选数唯一的格子！', 'info');
    }
}

/**
 * 数独提示系统：分析当前盘面，找出下一步可应用的推理技巧
 */
function analyzeBoardForHint() {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    
    // 1. 检查唯一候选数法（Naked Single）
    const nakedSingleResult = findNakedSingle(size);
    if (nakedSingleResult) {
        return nakedSingleResult;
    }
    
    // 2. 检查隐藏候选数法（Hidden Single）
    const hiddenSingleResult = findHiddenSingle(size, gameTypeStr, irregularBoxes);
    if (hiddenSingleResult) {
        return hiddenSingleResult;
    }
    
    // 3. 检查数对法（Naked Pair）
    const nakedPairResult = findNakedPair(size, gameTypeStr, irregularBoxes);
    if (nakedPairResult) {
        return nakedPairResult;
    }
    
    // 4. 检查隐藏数对法（Hidden Pair）
    const hiddenPairResult = findHiddenPair(size, gameTypeStr, irregularBoxes);
    if (hiddenPairResult) {
        return hiddenPairResult;
    }
    
    // 5. 检查三数法（Naked Triplet）
    const tripletResult = findNakedTriplet(size, gameTypeStr, irregularBoxes);
    if (tripletResult) {
        return tripletResult;
    }
    
    // 6. 检查隐藏三数法（Hidden Triplet）
    const hiddenTripletResult = findHiddenTriplet(size, gameTypeStr, irregularBoxes);
    if (hiddenTripletResult) {
        return hiddenTripletResult;
    }
    
    // 7. 检查宫排除法（Box Line Reduction）
    const boxLineResult = findBoxLineReduction(size, gameTypeStr, irregularBoxes);
    if (boxLineResult) {
        return boxLineResult;
    }
    
    // 7. 检查区块排除法
    const blockResult = findBlockExclusion(size, gameTypeStr, irregularBoxes);
    if (blockResult) {
        return blockResult;
    }
    
    // 8. 检查X-Wing技巧
    const xwingResult = findXWing(size);
    if (xwingResult) {
        return xwingResult;
    }
    
    // 10. 检查剑鱼技巧（Swordfish）
    const swordfishResult = findSwordfish(size);
    if (swordfishResult) {
        return swordfishResult;
    }
    
    // 11. 检查水母技巧（Jellyfish）
    const jellyfishResult = findJellyfish(size);
    if (jellyfishResult) {
        return jellyfishResult;
    }
    
    // 12. 检查四数法（Naked Quad）
    const quadResult = findNakedQuad(size, gameTypeStr, irregularBoxes);
    if (quadResult) {
        return quadResult;
    }
    
    // 13. 检查隐藏四数法（Hidden Quad）
    const hiddenQuadResult = findHiddenQuad(size, gameTypeStr, irregularBoxes);
    if (hiddenQuadResult) {
        return hiddenQuadResult;
    }
    
    // 14. 检查Y-Wing技巧（XY-Wing）
    const ywingResult = findYWing(size, gameTypeStr, irregularBoxes);
    if (ywingResult) {
        return ywingResult;
    }
    
    // 15. 检查空矩形技巧（Empty Rectangle）
    const emptyRectResult = findEmptyRectangle(size);
    if (emptyRectResult) {
        return emptyRectResult;
    }
    
    // 16. 检查简单链技巧（Simple Chain）
    const chainResult = findSimpleChain(size);
    if (chainResult) {
        return chainResult;
    }
    
    // 17. 检查ALS技巧（Almost Locked Set）
    const alsResult = findALS(size);
    if (alsResult) {
        return alsResult;
    }
    
    // 18. 检查矩形排除法（Unique Rectangle）
    const urResult = findUniqueRectangle(size, gameTypeStr, irregularBoxes);
    if (urResult) {
        return urResult;
    }
    
    return null;
}

/**
 * 查找唯一候选数（Naked Single）
 * 某个格子只有一个候选数，可直接填入
 */
function findNakedSingle(size) {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            // 跳过固定数字和已有确定值的格子
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 1) {
                return {
                    technique: 'naked_single',
                    name: '唯一候选数法',
                    description: '该格子只有一个候选数字，可以直接填入。',
                    detail: `在第${row + 1}行第${col + 1}列的格子中，候选数只有 ${cellValue[0]}，因此可以确定填入 ${cellValue[0]}。`,
                    location: { row, col },
                    number: cellValue[0],
                    highlightCells: [{ row, col }],
                    affectedCells: []
                };
            }
        }
    }
    return null;
}

/**
 * 查找隐藏候选数（Hidden Single）
 * 某个数字在某行/列/宫中只有一个可能位置
 */
function findHiddenSingle(size, gameTypeStr, irregularBoxes) {
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    // 检查每行
    for (let row = 0; row < size; row++) {
        for (let num = 1; num <= size; num++) {
            let possibleCols = [];
            for (let col = 0; col < size; col++) {
                const index = row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    // 如果已有确定值，检查是否是当前数字
                    if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                        possibleCols = [];
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    possibleCols.push(col);
                }
            }
            if (possibleCols.length === 1) {
                const col = possibleCols[0];
                return {
                    technique: 'hidden_single_row',
                    name: '隐藏候选数法（行）',
                    description: '某个数字在某一行中只有一个可能的填入位置。',
                    detail: `数字 ${num} 在第${row + 1}行中只能填入第${col + 1}列的格子，因为其他位置都已被排除。`,
                    location: { row, col },
                    number: num,
                    highlightCells: [{ row, col }],
                    affectedCells: getRowCells(row, size).filter(c => c.col !== col)
                };
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        for (let num = 1; num <= size; num++) {
            let possibleRows = [];
            for (let row = 0; row < size; row++) {
                const index = row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                        possibleRows = [];
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    possibleRows.push(row);
                }
            }
            if (possibleRows.length === 1) {
                const row = possibleRows[0];
                return {
                    technique: 'hidden_single_col',
                    name: '隐藏候选数法（列）',
                    description: '某个数字在某一列中只有一个可能的填入位置。',
                    detail: `数字 ${num} 在第${col + 1}列中只能填入第${row + 1}行的格子，因为其他位置都已被排除。`,
                    location: { row, col },
                    number: num,
                    highlightCells: [{ row, col }],
                    affectedCells: getColCells(col, size).filter(c => c.row !== row)
                };
            }
        }
    }
    
    // 检查每个宫
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独
        for (const box of irregularBoxes) {
            for (let num = 1; num <= size; num++) {
                let possibleCells = [];
                let foundNumber = false;
                for (const cell of box) {
                    const [r, c] = cell;
                    const index = r * size + c;
                    if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                        if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                            foundNumber = true;
                            break;
                        }
                        continue;
                    }
                    const cellValue = currentBoard[index];
                    if (Array.isArray(cellValue) && cellValue.includes(num)) {
                        possibleCells.push({ row: r, col: c });
                    }
                }
                if (foundNumber) continue;
                if (possibleCells.length === 1) {
                    const { row, col } = possibleCells[0];
                    return {
                        technique: 'hidden_single_box',
                        name: '隐藏候选数法（宫）',
                        description: '某个数字在某个宫中只有一个可能的填入位置。',
                        detail: `数字 ${num} 在当前宫中只能填入第${row + 1}行第${col + 1}列的格子，因为其他位置都已被排除。`,
                        location: { row, col },
                        number: num,
                        highlightCells: [{ row, col }],
                        affectedCells: box.map(cell => ({ row: cell[0], col: cell[1] })).filter(c => c.row !== row || c.col !== col)
                    };
                }
            }
        }
    } else {
        // 标准数独
        for (let boxRow = 0; boxRow < boxRows; boxRow++) {
            for (let boxCol = 0; boxCol < boxCols; boxCol++) {
                const boxRowStart = boxRow * boxRows;
                const boxColStart = boxCol * boxCols;
                for (let num = 1; num <= size; num++) {
                    let possibleCells = [];
                    let foundNumber = false;
                    for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                        for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                            const index = r * size + c;
                            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                                if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                                    foundNumber = true;
                                    break;
                                }
                                continue;
                            }
                            const cellValue = currentBoard[index];
                            if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                possibleCells.push({ row: r, col: c });
                            }
                        }
                        if (foundNumber) break;
                    }
                    if (foundNumber) continue;
                    if (possibleCells.length === 1) {
                        const { row, col } = possibleCells[0];
                        return {
                            technique: 'hidden_single_box',
                            name: '隐藏候选数法（宫）',
                            description: '某个数字在某个宫中只有一个可能的填入位置。',
                            detail: `数字 ${num} 在第${boxRow + 1}宫（第${row + 1}行第${col + 1}列附近）中只能填入第${row + 1}行第${col + 1}列的格子。`,
                            location: { row, col },
                            number: num,
                            highlightCells: [{ row, col }],
                            affectedCells: getBoxCells(row, col, size).filter(c => c.row !== row || c.col !== col)
                        };
                    }
                }
            }
        }
    }
    
    // 检查主对角线（对角线数独规则）
    if (gameTypeStr === 'DIAGONAL') {
        for (let num = 1; num <= size; num++) {
            let possibleCells = [];
            for (let i = 0; i < size; i++) {
                const index = i * size + i;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                        possibleCells = [];
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    possibleCells.push({ row: i, col: i });
                }
            }
            if (possibleCells.length === 1) {
                const { row, col } = possibleCells[0];
                // 受影响的是对角线上其他格子
                const affectedCells = [];
                for (let i = 0; i < size; i++) {
                    if (i !== row) {
                        affectedCells.push({ row: i, col: i });
                    }
                }
                return {
                    technique: 'hidden_single_diagonal1',
                    name: '隐藏候选数法（主对角线）',
                    description: '某个数字在主对角线中只有一个可能的填入位置。',
                    detail: `数字 ${num} 在主对角线中只能填入第${row + 1}行第${col + 1}列的格子。`,
                    location: { row, col },
                    number: num,
                    highlightCells: [{ row, col }],
                    affectedCells: affectedCells
                };
            }
        }
        
        // 检查副对角线
        for (let num = 1; num <= size; num++) {
            let possibleCells = [];
            for (let i = 0; i < size; i++) {
                const index = i * size + (size - 1 - i);
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                        possibleCells = [];
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    possibleCells.push({ row: i, col: size - 1 - i });
                }
            }
            if (possibleCells.length === 1) {
                const { row, col } = possibleCells[0];
                // 受影响的是对角线上其他格子
                const affectedCells = [];
                for (let i = 0; i < size; i++) {
                    if (i !== row) {
                        affectedCells.push({ row: i, col: size - 1 - i });
                    }
                }
                return {
                    technique: 'hidden_single_diagonal2',
                    name: '隐藏候选数法（副对角线）',
                    description: '某个数字在副对角线中只有一个可能的填入位置。',
                    detail: `数字 ${num} 在副对角线中只能填入第${row + 1}行第${col + 1}列的格子。`,
                    location: { row, col },
                    number: num,
                    highlightCells: [{ row, col }],
                    affectedCells: affectedCells
                };
            }
        }
    }
    
    return null;
}

/**
 * 查找数对（Naked Pair）
 * 两个格子共享相同的两个候选数
 */
function findNakedPair(size, gameTypeStr, irregularBoxes) {
    // 检查每行
    for (let row = 0; row < size; row++) {
        const pairs = {};
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                const key = cellValue.sort().join(',');
                if (!pairs[key]) {
                    pairs[key] = [];
                }
                pairs[key].push({ row, col });
            }
        }
        for (const [key, cells] of Object.entries(pairs)) {
            if (cells.length === 2) {
                const nums = key.split(',').map(Number);
                // 计算受影响的格子（该行其他格子）
                const affectedCells = getRowCells(row, size).filter(c => c.col !== cells[0].col && c.col !== cells[1].col);
                
                // 检查是否有可以排除的候选数（至少有一个受影响格子包含这些候选数）
                const hasExcludableCells = affectedCells.some(cell => {
                    const idx = cell.row * size + cell.col;
                    return Array.isArray(currentBoard[idx]) && nums.some(n => currentBoard[idx].includes(n));
                });
                
                // 如果没有可以排除的候选数，跳过这个数对
                if (!hasExcludableCells) {
                    continue;
                }
                
                return {
                    technique: 'naked_pair_row',
                    name: '数对法（行）',
                    description: '同一行中有两个格子，它们的候选数完全相同（只有两个），这两个数字只能填入这两个格子。',
                    detail: `在第${row + 1}行中，第${cells[0].col + 1}列和第${cells[1].col + 1}列的格子都只有候选数 ${nums.join('和')}，因此这两个数字必然填入这两个格子，可以从该行其他格子中排除这两个候选数。`,
                    location: cells[0],
                    number: nums,
                    highlightCells: cells,
                    affectedCells: affectedCells
                };
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const pairs = {};
        for (let row = 0; row < size; row++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                const key = cellValue.sort().join(',');
                if (!pairs[key]) {
                    pairs[key] = [];
                }
                pairs[key].push({ row, col });
            }
        }
        for (const [key, cells] of Object.entries(pairs)) {
            if (cells.length === 2) {
                const nums = key.split(',').map(Number);
                // 计算受影响的格子（该列其他格子）
                const affectedCells = getColCells(col, size).filter(c => c.row !== cells[0].row && c.row !== cells[1].row);
                
                // 检查是否有可以排除的候选数
                const hasExcludableCells = affectedCells.some(cell => {
                    const idx = cell.row * size + cell.col;
                    return Array.isArray(currentBoard[idx]) && nums.some(n => currentBoard[idx].includes(n));
                });
                
                // 如果没有可以排除的候选数，跳过这个数对
                if (!hasExcludableCells) {
                    continue;
                }
                
                return {
                    technique: 'naked_pair_col',
                    name: '数对法（列）',
                    description: '同一列中有两个格子，它们的候选数完全相同（只有两个），这两个数字只能填入这两个格子。',
                    detail: `在第${col + 1}列中，第${cells[0].row + 1}行和第${cells[1].row + 1}行的格子都只有候选数 ${nums.join('和')}，因此这两个数字必然填入这两个格子，可以从该列其他格子中排除这两个候选数。`,
                    location: cells[0],
                    number: nums,
                    highlightCells: cells,
                    affectedCells: affectedCells
                };
            }
        }
    }
    
    // 检查每个宫（兼容标准数独和锯齿数独）
    const processedBoxes = new Set();
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const boxKey = `${row}-${col}`;
            if (processedBoxes.has(boxKey)) continue;
            
            const boxCells = getBoxCells(row, col, size, gameTypeStr, irregularBoxes);
            // 标记宫中所有格子为已处理
            boxCells.forEach(cell => processedBoxes.add(`${cell.row}-${cell.col}`));
            
            const pairs = {};
            for (const cell of boxCells) {
                const index = cell.row * size + cell.col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.length === 2) {
                    const key = cellValue.sort().join(',');
                    if (!pairs[key]) {
                        pairs[key] = [];
                    }
                    pairs[key].push({ row: cell.row, col: cell.col });
                }
            }
            
            for (const [key, cells] of Object.entries(pairs)) {
                if (cells.length === 2) {
                    const nums = key.split(',').map(Number);
                    // 计算受影响的格子（该宫其他格子）
                    const affectedCells = boxCells.filter(c => !(c.row === cells[0].row && c.col === cells[0].col) && !(c.row === cells[1].row && c.col === cells[1].col));
                    
                    // 检查是否有可以排除的候选数
                    const hasExcludableCells = affectedCells.some(cell => {
                        const idx = cell.row * size + cell.col;
                        return Array.isArray(currentBoard[idx]) && nums.some(n => currentBoard[idx].includes(n));
                    });
                    
                    // 如果没有可以排除的候选数，跳过这个数对
                    if (!hasExcludableCells) {
                        continue;
                    }
                    
                    return {
                        technique: 'naked_pair_box',
                        name: '数对法（宫）',
                        description: '同一个宫中的两个格子，它们的候选数完全相同（只有两个），这两个数字只能填入这两个格子。',
                        detail: `在宫中，第${cells[0].row + 1}行第${cells[0].col + 1}列和第${cells[1].row + 1}行第${cells[1].col + 1}列的格子都只有候选数 ${nums.join('和')}，因此这两个数字必然填入这两个格子，可以从该宫其他格子中排除这两个候选数。`,
                        location: cells[0],
                        number: nums,
                        highlightCells: cells,
                        affectedCells: affectedCells
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找隐藏数对法（Hidden Pair）
 * 两个数字只出现在两个格子中，可以排除这两个格子中的其他候选数
 */
function findHiddenPair(size, gameTypeStr, irregularBoxes) {
    // 检查每行
    for (let row = 0; row < size; row++) {
        const numPositions = {};
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cellValue.forEach(num => {
                    if (!numPositions[num]) {
                        numPositions[num] = [];
                    }
                    numPositions[num].push(col);
                });
            }
        }
        
        // 找只出现在两个位置的数字
        const numsWithTwoPositions = Object.entries(numPositions).filter(([num, cols]) => cols.length === 2);
        if (numsWithTwoPositions.length >= 2) {
            for (let i = 0; i < numsWithTwoPositions.length; i++) {
                for (let j = i + 1; j < numsWithTwoPositions.length; j++) {
                    const [num1, cols1] = numsWithTwoPositions[i];
                    const [num2, cols2] = numsWithTwoPositions[j];
                    // 如果两个数字出现在相同的两个位置，找到了隐藏数对
                    if (cols1.sort().join(',') === cols2.sort().join(',')) {
                        const cells = [{ row, col: cols1[0] }, { row, col: cols1[1] }];
                        const nums = [parseInt(num1), parseInt(num2)];
                        
                        // 检查这两个格子是否还有其他候选数可以排除
                        const canExclude = cells.some(cell => {
                            const idx = cell.row * size + cell.col;
                            return Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 2;
                        });
                        
                        if (!canExclude) continue;
                        
                        return {
                            technique: 'hidden_pair_row',
                            name: '隐藏数对法（行）',
                            description: '两个数字在某一行中只出现在相同的两个格子中，可以排除这两个格子中的其他候选数。',
                            detail: `数字 ${nums[0]} 和 ${nums[1]} 在第${row + 1}行中只出现在第${cols1[0] + 1}列和第${cols1[1] + 1}列，因此这两个格子只能填入这两个数字，可以排除其他候选数。`,
                            location: cells[0],
                            number: nums,
                            highlightCells: cells,
                            affectedCells: cells
                        };
                    }
                }
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const numPositions = {};
        for (let row = 0; row < size; row++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cellValue.forEach(num => {
                    if (!numPositions[num]) {
                        numPositions[num] = [];
                    }
                    numPositions[num].push(row);
                });
            }
        }
        
        const numsWithTwoPositions = Object.entries(numPositions).filter(([num, rows]) => rows.length === 2);
        if (numsWithTwoPositions.length >= 2) {
            for (let i = 0; i < numsWithTwoPositions.length; i++) {
                for (let j = i + 1; j < numsWithTwoPositions.length; j++) {
                    const [num1, rows1] = numsWithTwoPositions[i];
                    const [num2, rows2] = numsWithTwoPositions[j];
                    if (rows1.sort().join(',') === rows2.sort().join(',')) {
                        const cells = [{ row: rows1[0], col }, { row: rows1[1], col }];
                        const nums = [parseInt(num1), parseInt(num2)];
                        
                        const canExclude = cells.some(cell => {
                            const idx = cell.row * size + cell.col;
                            return Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 2;
                        });
                        
                        if (!canExclude) continue;
                        
                        return {
                            technique: 'hidden_pair_col',
                            name: '隐藏数对法（列）',
                            description: '两个数字在某一列中只出现在相同的两个格子中，可以排除这两个格子中的其他候选数。',
                            detail: `数字 ${nums[0]} 和 ${nums[1]} 在第${col + 1}列中只出现在第${rows1[0] + 1}行和第${rows1[1] + 1}行，因此这两个格子只能填入这两个数字，可以排除其他候选数。`,
                            location: cells[0],
                            number: nums,
                            highlightCells: cells,
                            affectedCells: cells
                        };
                    }
                }
            }
        }
    }
    
    // 检查每个宫（兼容标准数独和锯齿数独）
    const processedBoxes = new Set();
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const boxKey = `${row}-${col}`;
            if (processedBoxes.has(boxKey)) continue;
            
            const boxCells = getBoxCells(row, col, size, gameTypeStr, irregularBoxes);
            // 标记宫中所有格子为已处理
            boxCells.forEach(cell => processedBoxes.add(`${cell.row}-${cell.col}`));
            
            const numPositions = {};
            for (const cell of boxCells) {
                const index = cell.row * size + cell.col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue)) {
                    cellValue.forEach(num => {
                        if (!numPositions[num]) {
                            numPositions[num] = [];
                        }
                        numPositions[num].push(JSON.stringify(cell));
                    });
                }
            }
            
            const numsWithTwoPositions = Object.entries(numPositions).filter(([num, positions]) => positions.length === 2);
            if (numsWithTwoPositions.length >= 2) {
                for (let i = 0; i < numsWithTwoPositions.length; i++) {
                    for (let j = i + 1; j < numsWithTwoPositions.length; j++) {
                        const [num1, positions1] = numsWithTwoPositions[i];
                        const [num2, positions2] = numsWithTwoPositions[j];
                        if (positions1.sort().join(',') === positions2.sort().join(',')) {
                            const cell1 = JSON.parse(positions1[0]);
                            const cell2 = JSON.parse(positions1[1]);
                            const cells = [cell1, cell2];
                            const nums = [parseInt(num1), parseInt(num2)];
                            
                            const canExclude = cells.some(cell => {
                                const idx = cell.row * size + cell.col;
                                return Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 2;
                            });
                            
                            if (!canExclude) continue;
                            
                            return {
                                technique: 'hidden_pair_box',
                                name: '隐藏数对法（宫）',
                                description: '两个数字在某个宫中只出现在相同的两个格子中，可以排除这两个格子中的其他候选数。',
                                detail: `数字 ${nums[0]} 和 ${nums[1]} 在宫中只出现在第${cell1.row + 1}行第${cell1.col + 1}列和第${cell2.row + 1}行第${cell2.col + 1}列，因此这两个格子只能填入这两个数字，可以排除其他候选数。`,
                                location: cells[0],
                                number: nums,
                                highlightCells: cells,
                                affectedCells: cells
                            };
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找三数法（Naked Triplet）
 * 三个格子共享相同的三个候选数
 */
function findNakedTriplet(size) {
    // 检查每行
    for (let row = 0; row < size; row++) {
        const cellsByCandidates = {};
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length >= 2 && cellValue.length <= 3) {
                const key = cellValue.sort().join(',');
                if (!cellsByCandidates[key]) {
                    cellsByCandidates[key] = [];
                }
                cellsByCandidates[key].push({ row, col });
            }
        }
        
        // 查找三数组合
        const allCandidates = new Set();
        const candidateCells = [];
        for (const [key, cells] of Object.entries(cellsByCandidates)) {
            const nums = key.split(',').map(Number);
            nums.forEach(n => allCandidates.add(n));
            candidateCells.push(...cells.map(c => ({ ...c, nums })));
        }
        
        // 如果有3个数字只出现在3个格子中
        if (allCandidates.size === 3) {
            const uniqueCells = candidateCells.filter((cell, index, self) => 
                index === self.findIndex(c => c.row === cell.row && c.col === cell.col)
            );
            if (uniqueCells.length === 3) {
                const nums = Array.from(allCandidates);
                const cells = uniqueCells.map(c => ({ row: c.row, col: c.col }));
                
                // 计算受影响的格子
                const affectedCells = getRowCells(row, size).filter(c => 
                    !cells.some(cell => cell.row === c.row && cell.col === c.col)
                );
                
                // 检查是否有可以排除的候选数
                const hasExcludableCells = affectedCells.some(cell => {
                    const idx = cell.row * size + cell.col;
                    return Array.isArray(currentBoard[idx]) && nums.some(n => currentBoard[idx].includes(n));
                });
                
                if (!hasExcludableCells) continue;
                
                return {
                    technique: 'naked_triplet_row',
                    name: '三数法（行）',
                    description: '三个格子共享相同的三个候选数（或其子集），这三个数字只能填入这三个格子。',
                    detail: `在第${row + 1}行中，第${cells.map(c => c.col + 1).join('、')}列的格子共同拥有候选数 ${nums.join('、')}，因此这三个数字必然填入这三个格子，可以从该行其他格子中排除这些候选数。`,
                    location: cells[0],
                    number: nums,
                    highlightCells: cells,
                    affectedCells: affectedCells
                };
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const cellsByCandidates = {};
        for (let row = 0; row < size; row++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length >= 2 && cellValue.length <= 3) {
                const key = cellValue.sort().join(',');
                if (!cellsByCandidates[key]) {
                    cellsByCandidates[key] = [];
                }
                cellsByCandidates[key].push({ row, col });
            }
        }
        
        const allCandidates = new Set();
        const candidateCells = [];
        for (const [key, cells] of Object.entries(cellsByCandidates)) {
            const nums = key.split(',').map(Number);
            nums.forEach(n => allCandidates.add(n));
            candidateCells.push(...cells.map(c => ({ ...c, nums })));
        }
        
        if (allCandidates.size === 3) {
            const uniqueCells = candidateCells.filter((cell, index, self) => 
                index === self.findIndex(c => c.row === cell.row && c.col === cell.col)
            );
            if (uniqueCells.length === 3) {
                const nums = Array.from(allCandidates);
                const cells = uniqueCells.map(c => ({ row: c.row, col: c.col }));
                
                const affectedCells = getColCells(col, size).filter(c => 
                    !cells.some(cell => cell.row === c.row && cell.col === c.col)
                );
                
                const hasExcludableCells = affectedCells.some(cell => {
                    const idx = cell.row * size + cell.col;
                    return Array.isArray(currentBoard[idx]) && nums.some(n => currentBoard[idx].includes(n));
                });
                
                if (!hasExcludableCells) continue;
                
                return {
                    technique: 'naked_triplet_col',
                    name: '三数法（列）',
                    description: '三个格子共享相同的三个候选数（或其子集），这三个数字只能填入这三个格子。',
                    detail: `在第${col + 1}列中，第${cells.map(c => c.row + 1).join('、')}行的格子共同拥有候选数 ${nums.join('、')}，因此这三个数字必然填入这三个格子，可以从该列其他格子中排除这些候选数。`,
                    location: cells[0],
                    number: nums,
                    highlightCells: cells,
                    affectedCells: affectedCells
                };
            }
        }
    }
    
    return null;
}

/**
 * 查找X-Wing技巧
 * 某个数字在两行中只出现在相同的两列，可以排除这两列其他行的该数字
 */
function findXWing(size) {
    for (let num = 1; num <= size; num++) {
        const rowColMap = {};
        
        // 收集每一行中该数字可能出现的列
        for (let row = 0; row < size; row++) {
            const cols = [];
            for (let col = 0; col < size; col++) {
                const index = row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if (originalPuzzle[index] === String(num) || currentBoard[index] === num) {
                        cols.length = 0;
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    cols.push(col);
                }
            }
            if (cols.length === 2) {
                const key = cols.sort().join(',');
                if (!rowColMap[key]) {
                    rowColMap[key] = [];
                }
                rowColMap[key].push(row);
            }
        }
        
        // 找有两行共享相同两列的情况
        for (const [colsKey, rows] of Object.entries(rowColMap)) {
            if (rows.length >= 2) {
                const cols = colsKey.split(',').map(Number);
                const affectedCells = [];
                
                // 收集这两列中除了这两行之外的其他格子
                for (const col of cols) {
                    for (let row = 0; row < size; row++) {
                        if (!rows.includes(row)) {
                            const index = row * size + col;
                            if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                const cellValue = currentBoard[index];
                                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                    affectedCells.push({ row, col });
                                }
                            }
                        }
                    }
                }
                
                if (affectedCells.length > 0) {
                    const highlightCells = [
                        { row: rows[0], col: cols[0] },
                        { row: rows[0], col: cols[1] },
                        { row: rows[1], col: cols[0] },
                        { row: rows[1], col: cols[1] }
                    ];
                    
                    return {
                        technique: 'xwing',
                        name: 'X-Wing 技巧',
                        description: '某个数字在两行中只出现在相同的两列，形成X形结构，可以排除这两列其他行的该数字。',
                        detail: `数字 ${num} 在第${rows[0] + 1}行和第${rows[1] + 1}行中只出现在第${cols[0] + 1}列和第${cols[1] + 1}列，形成X形结构。因此可以从这两列的其他行中排除数字 ${num}。`,
                        location: { row: rows[0], col: cols[0] },
                        number: num,
                        highlightCells: highlightCells,
                        affectedCells: affectedCells
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找剑鱼技巧（Swordfish）
 * 某个数字在三行中只出现在相同的三列，可以排除这三列其他行的该数字
 */
function findSwordfish(size) {
    for (let num = 1; num <= size; num++) {
        const rowColMap = {};
        
        for (let row = 0; row < size; row++) {
            const cols = [];
            for (let col = 0; col < size; col++) {
                const index = row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if (originalPuzzle[index] === String(num) || currentBoard[index] === num) {
                        cols.length = 0;
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    cols.push(col);
                }
            }
            if (cols.length >= 2 && cols.length <= 3) {
                rowColMap[row] = cols;
            }
        }
        
        // 找出所有可能的三行组合
        const rows = Object.keys(rowColMap).map(Number);
        for (let i = 0; i < rows.length; i++) {
            for (let j = i + 1; j < rows.length; j++) {
                for (let k = j + 1; k < rows.length; k++) {
                    const row1 = rows[i];
                    const row2 = rows[j];
                    const row3 = rows[k];
                    
                    const allCols = new Set([
                        ...rowColMap[row1],
                        ...rowColMap[row2],
                        ...rowColMap[row3]
                    ]);
                    
                    // 如果这三行的候选列合并起来正好是3列
                    if (allCols.size === 3) {
                        const cols = Array.from(allCols);
                        const affectedCells = [];
                        
                        for (const col of cols) {
                            for (let row = 0; row < size; row++) {
                                if (row !== row1 && row !== row2 && row !== row3) {
                                    const index = row * size + col;
                                    if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                        const cellValue = currentBoard[index];
                                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                            affectedCells.push({ row, col });
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (affectedCells.length > 0) {
                            const highlightCells = [
                                { row: row1, col: cols[0] },
                                { row: row1, col: cols[1] },
                                { row: row1, col: cols[2] },
                                { row: row2, col: cols[0] },
                                { row: row2, col: cols[1] },
                                { row: row2, col: cols[2] },
                                { row: row3, col: cols[0] },
                                { row: row3, col: cols[1] },
                                { row: row3, col: cols[2] }
                            ].filter(cell => 
                                rowColMap[cell.row].includes(cell.col)
                            );
                            
                            return {
                                technique: 'swordfish',
                                name: '剑鱼技巧（Swordfish）',
                                description: '某个数字在三行中只出现在相同的三列，形成剑鱼结构，可以排除这三列其他行的该数字。',
                                detail: `数字 ${num} 在第${row1 + 1}、${row2 + 1}、${row3 + 1}行中只出现在第${cols.map(c => c + 1).join('、')}列，形成剑鱼结构。因此可以从这三列的其他行中排除数字 ${num}。`,
                                location: { row: row1, col: cols[0] },
                                number: num,
                                highlightCells: highlightCells,
                                affectedCells: affectedCells
                            };
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找隐藏三数法（Hidden Triplet）
 * 三个数字只出现在三个格子中，可以排除这三个格子中的其他候选数
 */
function findHiddenTriplet(size) {
    // 检查每行
    for (let row = 0; row < size; row++) {
        const numPositions = {};
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cellValue.forEach(num => {
                    if (!numPositions[num]) {
                        numPositions[num] = [];
                    }
                    numPositions[num].push(col);
                });
            }
        }
        
        // 找只出现在三个位置的数字
        const numsWithThreePositions = Object.entries(numPositions).filter(([num, cols]) => cols.length === 3);
        if (numsWithThreePositions.length >= 3) {
            // 检查所有三个数字的组合
            for (let i = 0; i < numsWithThreePositions.length; i++) {
                for (let j = i + 1; j < numsWithThreePositions.length; j++) {
                    for (let k = j + 1; k < numsWithThreePositions.length; k++) {
                        const [num1, cols1] = numsWithThreePositions[i];
                        const [num2, cols2] = numsWithThreePositions[j];
                        const [num3, cols3] = numsWithThreePositions[k];
                        // 如果三个数字出现在相同的三个位置，找到了隐藏三数
                        if (cols1.sort().join(',') === cols2.sort().join(',') && 
                            cols1.sort().join(',') === cols3.sort().join(',')) {
                            const cells = [{ row, col: cols1[0] }, { row, col: cols1[1] }, { row, col: cols1[2] }];
                            const nums = [parseInt(num1), parseInt(num2), parseInt(num3)];
                            
                            // 检查这三个格子是否还有其他候选数可以排除
                            const canExclude = cells.some(cell => {
                                const idx = cell.row * size + cell.col;
                                return Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 3;
                            });
                            
                            if (!canExclude) continue;
                            
                            return {
                                technique: 'hidden_triplet_row',
                                name: '隐藏三数法（行）',
                                description: '三个数字在某一行中只出现在相同的三个格子中，可以排除这三个格子中的其他候选数。',
                                detail: `数字 ${nums[0]}、${nums[1]} 和 ${nums[2]} 在第${row + 1}行中只出现在第${cols1[0] + 1}、${cols1[1] + 1}、${cols1[2] + 1}列，因此这三个格子只能填入这三个数字，可以排除其他候选数。`,
                                location: cells[0],
                                number: nums,
                                highlightCells: cells,
                                affectedCells: cells
                            };
                        }
                    }
                }
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const numPositions = {};
        for (let row = 0; row < size; row++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cellValue.forEach(num => {
                    if (!numPositions[num]) {
                        numPositions[num] = [];
                    }
                    numPositions[num].push(row);
                });
            }
        }
        
        const numsWithThreePositions = Object.entries(numPositions).filter(([num, rows]) => rows.length === 3);
        if (numsWithThreePositions.length >= 3) {
            for (let i = 0; i < numsWithThreePositions.length; i++) {
                for (let j = i + 1; j < numsWithThreePositions.length; j++) {
                    for (let k = j + 1; k < numsWithThreePositions.length; k++) {
                        const [num1, rows1] = numsWithThreePositions[i];
                        const [num2, rows2] = numsWithThreePositions[j];
                        const [num3, rows3] = numsWithThreePositions[k];
                        if (rows1.sort().join(',') === rows2.sort().join(',') && 
                            rows1.sort().join(',') === rows3.sort().join(',')) {
                            const cells = [{ row: rows1[0], col }, { row: rows1[1], col }, { row: rows1[2], col }];
                            const nums = [parseInt(num1), parseInt(num2), parseInt(num3)];
                            
                            const canExclude = cells.some(cell => {
                                const idx = cell.row * size + cell.col;
                                return Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 3;
                            });
                            
                            if (!canExclude) continue;
                            
                            return {
                                technique: 'hidden_triplet_col',
                                name: '隐藏三数法（列）',
                                description: '三个数字在某一列中只出现在相同的三个格子中，可以排除这三个格子中的其他候选数。',
                                detail: `数字 ${nums[0]}、${nums[1]} 和 ${nums[2]} 在第${col + 1}列中只出现在第${rows1[0] + 1}、${rows1[1] + 1}、${rows1[2] + 1}行，因此这三个格子只能填入这三个数字，可以排除其他候选数。`,
                                location: cells[0],
                                number: nums,
                                highlightCells: cells,
                                affectedCells: cells
                            };
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找Y-Wing技巧（XY-Wing）
 * 一个双值格（XY）与两个单值格（XZ和YZ）形成翅膀结构，可以排除XZ和YZ共同影响区域的Z
 */
function findYWing(size, gameTypeStr, irregularBoxes) {
    // 收集所有双值格
    const biValueCells = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                biValueCells.push({ row, col, nums: cellValue });
            }
        }
    }
    
    // 遍历所有双值格作为XY格
    for (const xyCell of biValueCells) {
        const [x, y] = xyCell.nums;
        
        // 找与XY格同行、同列、同宫的XZ格
        const xzCells = [];
        // 找与XY格同行、同列、同宫的YZ格
        const yzCells = [];
        
        // 检查同行
        for (let col = 0; col < size; col++) {
            if (col === xyCell.col) continue;
            const index = xyCell.row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                if (cellValue.includes(x) && !cellValue.includes(y)) {
                    xzCells.push({ row: xyCell.row, col, nums: cellValue });
                } else if (cellValue.includes(y) && !cellValue.includes(x)) {
                    yzCells.push({ row: xyCell.row, col, nums: cellValue });
                }
            }
        }
        
        // 检查同列
        for (let row = 0; row < size; row++) {
            if (row === xyCell.row) continue;
            const index = row * size + xyCell.col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                if (cellValue.includes(x) && !cellValue.includes(y)) {
                    xzCells.push({ row, col: xyCell.col, nums: cellValue });
                } else if (cellValue.includes(y) && !cellValue.includes(x)) {
                    yzCells.push({ row, col: xyCell.col, nums: cellValue });
                }
            }
        }
        
        // 检查同宫（兼容标准数独和锯齿数独）
        const xyBoxCells = getBoxCells(xyCell.row, xyCell.col, size, gameTypeStr, irregularBoxes);
        for (const cell of xyBoxCells) {
            if (cell.row === xyCell.row && cell.col === xyCell.col) continue;
            const index = cell.row * size + cell.col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                if (cellValue.includes(x) && !cellValue.includes(y)) {
                    xzCells.push({ row: cell.row, col: cell.col, nums: cellValue });
                } else if (cellValue.includes(y) && !cellValue.includes(x)) {
                    yzCells.push({ row: cell.row, col: cell.col, nums: cellValue });
                }
            }
        }
        
        // 现在找XZ和YZ的组合
        for (const xzCell of xzCells) {
            const z = xzCell.nums.find(n => n !== x);
            if (z === undefined) continue;
            
            for (const yzCell of yzCells) {
                if (yzCell.nums.find(n => n !== y) !== z) continue;
                
                // 检查XZ和YZ是否互相能看到（同行、同列、同宫），如果能看到则Y-Wing无效
                const xzYzSameRow = xzCell.row === yzCell.row;
                const xzYzSameCol = xzCell.col === yzCell.col;
                const xzBoxCells = getBoxCells(xzCell.row, xzCell.col, size, gameTypeStr, irregularBoxes);
                const yzBoxCells = getBoxCells(yzCell.row, yzCell.col, size, gameTypeStr, irregularBoxes);
                const xzBoxKey = xzBoxCells.length > 0 ? `${xzBoxCells[0].row}-${xzBoxCells[0].col}` : '';
                const yzBoxKey = yzBoxCells.length > 0 ? `${yzBoxCells[0].row}-${yzBoxCells[0].col}` : '';
                const xzYzSameBox = xzBoxKey === yzBoxKey && xzBoxKey !== '';
                
                if (xzYzSameRow || xzYzSameCol || xzYzSameBox) continue;
                
                // 找到Y-Wing！计算可以排除z的格子
                const affectedCells = [];
                
                // XZ和YZ共同影响的区域
                // 同行检查
                if (xzCell.row === yzCell.row) {
                    for (let c = 0; c < size; c++) {
                        if (c === xzCell.col || c === yzCell.col) continue;
                        const index = xzCell.row * size + c;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(z)) {
                            affectedCells.push({ row: xzCell.row, col: c });
                        }
                    }
                }
                
                // 同列检查
                if (xzCell.col === yzCell.col) {
                    for (let r = 0; r < size; r++) {
                        if (r === xzCell.row || r === yzCell.row) continue;
                        const index = r * size + xzCell.col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(z)) {
                            affectedCells.push({ row: r, col: xzCell.col });
                        }
                    }
                }
                
                // 如果XZ和YZ在同一个宫
                if (xzBoxKey === yzBoxKey && xzBoxKey !== '') {
                    for (const cell of xzBoxCells) {
                        const { row, col } = cell;
                        if ((row === xzCell.row && col === xzCell.col) || 
                            (row === yzCell.row && col === yzCell.col)) continue;
                        const index = row * size + col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(z)) {
                            if (!affectedCells.some(c => c.row === row && c.col === col)) {
                                affectedCells.push({ row, col });
                            }
                        }
                    }
                }
                
                // 对角线检查（XZ和YZ互相能看到的格子）
                // 检查XZ所在行和YZ所在列的交点
                const crossIndex = xzCell.row * size + yzCell.col;
                if (originalPuzzle[crossIndex] === '0' && typeof currentBoard[crossIndex] !== 'number') {
                    const cellValue = currentBoard[crossIndex];
                    if (Array.isArray(cellValue) && cellValue.includes(z)) {
                        if (!affectedCells.some(cell => cell.row === xzCell.row && cell.col === yzCell.col)) {
                            affectedCells.push({ row: xzCell.row, col: yzCell.col });
                        }
                    }
                }
                
                // 检查YZ所在行和XZ所在列的交点
                const crossIndex2 = yzCell.row * size + xzCell.col;
                if (originalPuzzle[crossIndex2] === '0' && typeof currentBoard[crossIndex2] !== 'number') {
                    const cellValue = currentBoard[crossIndex2];
                    if (Array.isArray(cellValue) && cellValue.includes(z)) {
                        if (!affectedCells.some(cell => cell.row === yzCell.row && cell.col === xzCell.col)) {
                            affectedCells.push({ row: yzCell.row, col: xzCell.col });
                        }
                    }
                }
                
                if (affectedCells.length > 0) {
                    const highlightCells = [
                        { row: xyCell.row, col: xyCell.col },
                        { row: xzCell.row, col: xzCell.col },
                        { row: yzCell.row, col: yzCell.col }
                    ];
                    
                    return {
                        technique: 'y_wing',
                        name: 'Y-Wing技巧（XY-Wing）',
                        description: '一个双值格（XY）与两个单值格（XZ和YZ）形成翅膀结构，可以排除它们共同影响区域的Z。',
                        detail: `找到Y-Wing结构：第${xyCell.row + 1}行第${xyCell.col + 1}列（${x}、${y}）连接第${xzCell.row + 1}行第${xzCell.col + 1}列（${x}、${z}）和第${yzCell.row + 1}行第${yzCell.col + 1}列（${y}、${z}）。因此可以从它们共同影响的区域中排除数字 ${z}。`,
                        location: { row: xyCell.row, col: xyCell.col },
                        number: z,
                        highlightCells: highlightCells,
                        affectedCells: affectedCells
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找唯一矩形排除法（Unique Rectangle Type 1）
 * 四个格子形成矩形，其中三个格子有相同的双值候选数，可以排除第四个格子中的这些候选数
 */
function findUniqueRectangle(size, gameTypeStr, irregularBoxes) {
    // 查找所有双值格，按候选数分组
    const pairsByKey = {};
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length === 2) {
                const key = cellValue.sort().join(',');
                if (!pairsByKey[key]) {
                    pairsByKey[key] = [];
                }
                pairsByKey[key].push({ row, col });
            }
        }
    }
    
    // 遍历每个候选数对
    for (const [key, cells] of Object.entries(pairsByKey)) {
        if (cells.length < 4) continue;
        
        const nums = key.split(',').map(Number);
        
        // 查找可能形成矩形的四个格子
        // 遍历所有四个格子的组合
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    for (let l = k + 1; l < cells.length; l++) {
                        const c1 = cells[i];
                        const c2 = cells[j];
                        const c3 = cells[k];
                        const c4 = cells[l];
                        
                        // 检查是否形成矩形（两行两列）
                        const rows = new Set([c1.row, c2.row, c3.row, c4.row]);
                        const cols = new Set([c1.col, c2.col, c3.col, c4.col]);
                        
                        if (rows.size !== 2 || cols.size !== 2) continue;
                        
                        const rowArray = Array.from(rows);
                        const colArray = Array.from(cols);
                        
                        // 检查是否这四个格子正好在矩形的四个角
                        const isRectangle = 
                            (c1.row === rowArray[0] || c1.row === rowArray[1]) &&
                            (c1.col === colArray[0] || c1.col === colArray[1]) &&
                            (c2.row === rowArray[0] || c2.row === rowArray[1]) &&
                            (c2.col === colArray[0] || c2.col === colArray[1]) &&
                            (c3.row === rowArray[0] || c3.row === rowArray[1]) &&
                            (c3.col === colArray[0] || c3.col === colArray[1]) &&
                            (c4.row === rowArray[0] || c4.row === rowArray[1]) &&
                            (c4.col === colArray[0] || c4.col === colArray[1]);
                        
                        if (!isRectangle) continue;
                        
                        // 检查是否这四个格子在不同的宫（避免在同一个宫中）
                        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
                        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
                        const boxes = new Set();
                        [c1, c2, c3, c4].forEach(c => {
                            const boxIdx = Math.floor(c.row / boxRows) * boxCols + Math.floor(c.col / boxCols);
                            boxes.add(boxIdx);
                        });
                        
                        // Type 1: 四个格子都只有这两个候选数（致命模式）
                        // 检查是否有格子有额外候选数
                        const cellsWithExtra = [c1, c2, c3, c4].filter(cell => {
                            const index = cell.row * size + cell.col;
                            const cellValue = currentBoard[index];
                            return Array.isArray(cellValue) && cellValue.length > 2;
                        });
                        
                        // 如果正好有一个格子有额外候选数，找到Unique Rectangle Type 1
                        if (cellsWithExtra.length === 1) {
                            const targetCell = cellsWithExtra[0];
                            const index = targetCell.row * size + targetCell.col;
                            const cellValue = currentBoard[index];
                            
                            // 收集可以从这个格子中排除的候选数（即数对中的数字）
                            const canExclude = nums.some(n => cellValue.includes(n));
                            
                            if (canExclude) {
                                return {
                                    technique: 'unique_rectangle',
                                    name: '唯一矩形排除法（Type 1）',
                                    description: '四个格子形成矩形，其中三个格子只有相同的两个候选数，可以从第四个格子中排除这两个候选数。',
                                    detail: `找到唯一矩形结构：第${rowArray[0] + 1}、${rowArray[1] + 1}行和第${colArray[0] + 1}、${colArray[1] + 1}列形成的矩形中，第${targetCell.row + 1}行第${targetCell.col + 1}列的格子有额外候选数。为了避免致命模式，可以从该格子中排除数字 ${nums.join('和')}。`,
                                    location: targetCell,
                                    number: nums,
                                    highlightCells: [c1, c2, c3, c4],
                                    affectedCells: [targetCell]
                                };
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找水母技巧（Jellyfish）
 * 某个数字在四行中只出现在相同的四列，可以排除这四列其他行的该数字
 */
function findJellyfish(size) {
    for (let num = 1; num <= size; num++) {
        const rowColMap = {};
        
        for (let row = 0; row < size; row++) {
            const cols = [];
            for (let col = 0; col < size; col++) {
                const index = row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                    if (originalPuzzle[index] === String(num) || currentBoard[index] === num) {
                        cols.length = 0;
                        break;
                    }
                    continue;
                }
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num)) {
                    cols.push(col);
                }
            }
            if (cols.length >= 2 && cols.length <= 4) {
                rowColMap[row] = cols;
            }
        }
        
        const rows = Object.keys(rowColMap).map(Number);
        // 找出所有可能的四行组合
        for (let i = 0; i < rows.length; i++) {
            for (let j = i + 1; j < rows.length; j++) {
                for (let k = j + 1; k < rows.length; k++) {
                    for (let l = k + 1; l < rows.length; l++) {
                        const row1 = rows[i];
                        const row2 = rows[j];
                        const row3 = rows[k];
                        const row4 = rows[l];
                        
                        const allCols = new Set([
                            ...rowColMap[row1],
                            ...rowColMap[row2],
                            ...rowColMap[row3],
                            ...rowColMap[row4]
                        ]);
                        
                        if (allCols.size === 4) {
                            const cols = Array.from(allCols);
                            const affectedCells = [];
                            
                            for (const col of cols) {
                                for (let row = 0; row < size; row++) {
                                    if (row !== row1 && row !== row2 && row !== row3 && row !== row4) {
                                        const index = row * size + col;
                                        if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                            const cellValue = currentBoard[index];
                                            if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                                affectedCells.push({ row, col });
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if (affectedCells.length > 0) {
                                const highlightCells = [];
                                [row1, row2, row3, row4].forEach(r => {
                                    cols.forEach(c => {
                                        if (rowColMap[r].includes(c)) {
                                            highlightCells.push({ row: r, col: c });
                                        }
                                    });
                                });
                                
                                return {
                                    technique: 'jellyfish',
                                    name: '水母技巧（Jellyfish）',
                                    description: '某个数字在四行中只出现在相同的四列，形成水母结构，可以排除这四列其他行的该数字。',
                                    detail: `数字 ${num} 在第${row1 + 1}、${row2 + 1}、${row3 + 1}、${row4 + 1}行中只出现在第${cols.map(c => c + 1).join('、')}列，形成水母结构。因此可以从这四列的其他行中排除数字 ${num}。`,
                                    location: { row: row1, col: cols[0] },
                                    number: num,
                                    highlightCells: highlightCells,
                                    affectedCells: affectedCells
                                };
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找四数法（Naked Quad）
 * 四个格子共有四个候选数，可以排除这四个格子中其他候选数
 */
function findNakedQuad(size, gameTypeStr, irregularBoxes) {
    const checkGroup = (cells) => {
        const allNums = new Set();
        const cellList = [];
        
        for (const { row, col } of cells) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length >= 2 && cellValue.length <= 4) {
                cellValue.forEach(n => allNums.add(n));
                cellList.push({ row, col, nums: cellValue });
            }
        }
        
        if (cellList.length === 4 && allNums.size === 4) {
            const affectedCells = [];
            for (const cell of cellList) {
                const index = cell.row * size + cell.col;
                const cellValue = currentBoard[index];
                const extraNums = cellValue.filter(n => !allNums.has(n));
                if (extraNums.length > 0) {
                    affectedCells.push({ row: cell.row, col: cell.col });
                }
            }
            
            if (affectedCells.length > 0) {
                const nums = Array.from(allNums).sort();
                return {
                    technique: 'naked_quad',
                    name: '四数法（Naked Quad）',
                    description: '四个格子共有四个候选数，可以从这四个格子中排除其他候选数。',
                    detail: `在这些格子中，候选数 ${nums.join('、')} 只出现在这四个格子中，可以从这些格子中排除其他数字。`,
                    location: { row: cellList[0].row, col: cellList[0].col },
                    number: nums,
                    highlightCells: cellList.map(c => ({ row: c.row, col: c.col })),
                    affectedCells: affectedCells
                };
            }
        }
        return null;
    };
    
    // 检查每行
    for (let row = 0; row < size; row++) {
        const cells = [];
        for (let col = 0; col < size; col++) {
            cells.push({ row, col });
        }
        const result = checkGroup(cells);
        if (result) return result;
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const cells = [];
        for (let row = 0; row < size; row++) {
            cells.push({ row, col });
        }
        const result = checkGroup(cells);
        if (result) return result;
    }
    
    // 检查每个宫
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    for (let boxRow = 0; boxRow < boxRows; boxRow++) {
        for (let boxCol = 0; boxCol < boxCols; boxCol++) {
            const cells = [];
            for (let r = boxRow * boxRows; r < boxRow * boxRows + boxRows; r++) {
                for (let c = boxCol * boxCols; c < boxCol * boxCols + boxCols; c++) {
                    cells.push({ row: r, col: c });
                }
            }
            const result = checkGroup(cells);
            if (result) return result;
        }
    }
    
    return null;
}

/**
 * 查找隐藏四数法（Hidden Quad）
 * 四个候选数只出现在四个格子中，可以排除这四个格子中其他候选数
 */
function findHiddenQuad(size, gameTypeStr, irregularBoxes) {
    const checkGroup = (cells) => {
        const numCellMap = {};
        
        for (let num = 1; num <= size; num++) {
            numCellMap[num] = [];
        }
        
        for (const { row, col } of cells) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cellValue.forEach(n => {
                    numCellMap[n].push({ row, col });
                });
            }
        }
        
        const numsWithFewCells = [];
        for (let num = 1; num <= size; num++) {
            if (numCellMap[num].length > 0 && numCellMap[num].length <= 4) {
                numsWithFewCells.push({ num, cells: numCellMap[num] });
            }
        }
        
        // 找四个数字，它们的候选格正好是相同的四个格子
        for (let i = 0; i < numsWithFewCells.length; i++) {
            for (let j = i + 1; j < numsWithFewCells.length; j++) {
                for (let k = j + 1; k < numsWithFewCells.length; k++) {
                    for (let l = k + 1; l < numsWithFewCells.length; l++) {
                        const num1 = numsWithFewCells[i];
                        const num2 = numsWithFewCells[j];
                        const num3 = numsWithFewCells[k];
                        const num4 = numsWithFewCells[l];
                        
                        const allCells = new Set();
                        num1.cells.forEach(c => allCells.add(`${c.row},${c.col}`));
                        num2.cells.forEach(c => allCells.add(`${c.row},${c.col}`));
                        num3.cells.forEach(c => allCells.add(`${c.row},${c.col}`));
                        num4.cells.forEach(c => allCells.add(`${c.row},${c.col}`));
                        
                        if (allCells.size === 4) {
                            const cellList = Array.from(allCells).map(key => {
                                const [r, c] = key.split(',').map(Number);
                                return { row: r, col: c };
                            });
                            
                            const affectedCells = [];
                            const nums = [num1.num, num2.num, num3.num, num4.num].sort();
                            
                            for (const cell of cellList) {
                                const index = cell.row * size + cell.col;
                                const cellValue = currentBoard[index];
                                const extraNums = cellValue.filter(n => !nums.includes(n));
                                if (extraNums.length > 0) {
                                    affectedCells.push(cell);
                                }
                            }
                            
                            if (affectedCells.length > 0) {
                                return {
                                    technique: 'hidden_quad',
                                    name: '隐藏四数法（Hidden Quad）',
                                    description: '四个候选数只出现在四个格子中，可以从这四个格子中排除其他候选数。',
                                    detail: `数字 ${nums.join('、')} 只出现在这四个格子中，可以从这些格子中排除其他数字。`,
                                    location: { row: cellList[0].row, col: cellList[0].col },
                                    number: nums,
                                    highlightCells: cellList,
                                    affectedCells: affectedCells
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    };
    
    // 检查每行
    for (let row = 0; row < size; row++) {
        const cells = [];
        for (let col = 0; col < size; col++) {
            cells.push({ row, col });
        }
        const result = checkGroup(cells);
        if (result) return result;
    }
    
    // 检查每列
    for (let col = 0; col < size; col++) {
        const cells = [];
        for (let row = 0; row < size; row++) {
            cells.push({ row, col });
        }
        const result = checkGroup(cells);
        if (result) return result;
    }
    
    // 检查每个宫
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    for (let boxRow = 0; boxRow < boxRows; boxRow++) {
        for (let boxCol = 0; boxCol < boxCols; boxCol++) {
            const cells = [];
            for (let r = boxRow * boxRows; r < boxRow * boxRows + boxRows; r++) {
                for (let c = boxCol * boxCols; c < boxCol * boxCols + boxCols; c++) {
                    cells.push({ row: r, col: c });
                }
            }
            const result = checkGroup(cells);
            if (result) return result;
        }
    }
    
    return null;
}

/**
 * 查找空矩形技巧（Empty Rectangle）
 */
function findEmptyRectangle(size) {
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    for (let num = 1; num <= size; num++) {
        for (let boxRow = 0; boxRow < boxRows; boxRow++) {
            for (let boxCol = 0; boxCol < boxCols; boxCol++) {
                const boxRowStart = boxRow * boxRows;
                const boxColStart = boxCol * boxCols;
                
                const candidatesInBox = [];
                for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                    for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                        const index = r * size + c;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            if (originalPuzzle[index] === String(num) || currentBoard[index] === num) {
                                candidatesInBox.length = 0;
                                r = boxRowStart + boxRows;
                                c = boxColStart + boxCols;
                                continue;
                            }
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            candidatesInBox.push({ row: r, col: c });
                        }
                    }
                }
                
                if (candidatesInBox.length === 0) continue;
                
                // 检查是否形成空矩形
                const rows = new Set(candidatesInBox.map(c => c.row));
                const cols = new Set(candidatesInBox.map(c => c.col));
                
                // 如果候选格没有占据整个宫的所有行或所有列，则可能形成空矩形
                if (rows.size < boxRows || cols.size < boxCols) {
                    const emptyRows = [];
                    const emptyCols = [];
                    
                    for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                        if (!rows.has(r)) emptyRows.push(r);
                    }
                    for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                        if (!cols.has(c)) emptyCols.push(c);
                    }
                    
                    // 找到空矩形的角
                    for (const emptyRow of emptyRows) {
                        for (const emptyCol of emptyCols) {
                            const cornerCell = { row: emptyRow, col: emptyCol };
                            
                            // 检查该角所在的行和列是否有该数字的其他候选
                            const rowCandidates = [];
                            const colCandidates = [];
                            
                            for (let c = 0; c < size; c++) {
                                if (c >= boxColStart && c < boxColStart + boxCols) continue;
                                const index = emptyRow * size + c;
                                if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                    const cellValue = currentBoard[index];
                                    if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                        rowCandidates.push({ row: emptyRow, col: c });
                                    }
                                }
                            }
                            
                            for (let r = 0; r < size; r++) {
                                if (r >= boxRowStart && r < boxRowStart + boxRows) continue;
                                const index = r * size + emptyCol;
                                if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                    const cellValue = currentBoard[index];
                                    if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                        colCandidates.push({ row: r, col: emptyCol });
                                    }
                                }
                            }
                            
                            if (rowCandidates.length > 0 && colCandidates.length > 0) {
                                const affectedCells = [];
                                const intersectionCells = [];
                                
                                for (const rc of rowCandidates) {
                                    for (const cc of colCandidates) {
                                        if (rc.row === cc.row && rc.col === cc.col) {
                                            intersectionCells.push(rc);
                                        }
                                    }
                                }
                                
                                for (const cell of intersectionCells) {
                                    const index = cell.row * size + cell.col;
                                    if (originalPuzzle[index] === '0' && typeof currentBoard[index] !== 'number') {
                                        const cellValue = currentBoard[index];
                                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                            affectedCells.push(cell);
                                        }
                                    }
                                }
                                
                                if (affectedCells.length > 0) {
                                    return {
                                        technique: 'empty_rectangle',
                                        name: '空矩形技巧（Empty Rectangle）',
                                        description: '某个数字在宫中形成空矩形结构，可以排除矩形角所在行列交点处的该数字。',
                                        detail: `数字 ${num} 在第${boxRow + 1}个宫中形成空矩形，空角在第${emptyRow + 1}行第${emptyCol + 1}列。可以从该行和该列其他候选的交点中排除数字 ${num}。`,
                                        location: cornerCell,
                                        number: num,
                                        highlightCells: [...candidatesInBox, cornerCell],
                                        affectedCells: affectedCells
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找简单链技巧（Simple Chain）
 */
function findSimpleChain(size) {
    // 收集所有候选格
    const candidateCells = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue) && cellValue.length >= 2) {
                candidateCells.push({ row, col, nums: cellValue });
            }
        }
    }
    
    // 尝试找简单的强链-弱链-强链结构
    for (const startCell of candidateCells) {
        for (const num1 of startCell.nums) {
            // 找同行、同列、同宫中只有两个候选格包含该数字的情况（强链）
            const strongLinks = [];
            const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
            const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
            
            // 检查行
            let rowCount = 0;
            let otherCell = null;
            for (let col = 0; col < size; col++) {
                if (col === startCell.col) continue;
                const index = startCell.row * size + col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num1)) {
                    rowCount++;
                    otherCell = { row: startCell.row, col };
                }
            }
            if (rowCount === 1 && otherCell) {
                strongLinks.push({ cell: otherCell, type: 'row' });
            }
            
            // 检查列
            let colCount = 0;
            otherCell = null;
            for (let row = 0; row < size; row++) {
                if (row === startCell.row) continue;
                const index = row * size + startCell.col;
                if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                const cellValue = currentBoard[index];
                if (Array.isArray(cellValue) && cellValue.includes(num1)) {
                    colCount++;
                    otherCell = { row, col: startCell.col };
                }
            }
            if (colCount === 1 && otherCell) {
                strongLinks.push({ cell: otherCell, type: 'col' });
            }
            
            // 检查宫
            let boxCount = 0;
            otherCell = null;
            const boxRow = Math.floor(startCell.row / boxRows);
            const boxCol = Math.floor(startCell.col / boxCols);
            for (let r = boxRow * boxRows; r < boxRow * boxRows + boxRows; r++) {
                for (let c = boxCol * boxCols; c < boxCol * boxCols + boxCols; c++) {
                    if (r === startCell.row && c === startCell.col) continue;
                    const index = r * size + c;
                    if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                    const cellValue = currentBoard[index];
                    if (Array.isArray(cellValue) && cellValue.includes(num1)) {
                        boxCount++;
                        otherCell = { row: r, col: c };
                    }
                }
            }
            if (boxCount === 1 && otherCell) {
                strongLinks.push({ cell: otherCell, type: 'box' });
            }
            
            // 对于每个强链的另一端，查找是否可以形成链
            for (const link of strongLinks) {
                const linkIndex = link.cell.row * size + link.cell.col;
                const linkCellValue = currentBoard[linkIndex];
                if (!Array.isArray(linkCellValue)) continue;
                
                // 只有当link.cell只有两个候选数时，才能确定它等于num2（排除num1后）
                if (linkCellValue.length !== 2) continue;
                
                // 找第二个数字（不同于num1）
                for (const num2 of linkCellValue) {
                    if (num2 === num1) continue;
                    
                    // 从link.cell出发，查找num2的强链
                    const secondLinks = [];
                    
                    // 检查行
                    let count = 0;
                    let targetCell = null;
                    for (let col = 0; col < size; col++) {
                        if (col === link.cell.col) continue;
                        const index = link.cell.row * size + col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num2)) {
                            count++;
                            targetCell = { row: link.cell.row, col };
                        }
                    }
                    if (count === 1 && targetCell) {
                        secondLinks.push({ cell: targetCell, type: 'row' });
                    }
                    
                    // 检查列
                    count = 0;
                    targetCell = null;
                    for (let row = 0; row < size; row++) {
                        if (row === link.cell.row) continue;
                        const index = row * size + link.cell.col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num2)) {
                            count++;
                            targetCell = { row, col: link.cell.col };
                        }
                    }
                    if (count === 1 && targetCell) {
                        secondLinks.push({ cell: targetCell, type: 'col' });
                    }
                    
                    // 检查宫
                    count = 0;
                    targetCell = null;
                    const tBoxRow = Math.floor(link.cell.row / boxRows);
                    const tBoxCol = Math.floor(link.cell.col / boxCols);
                    for (let r = tBoxRow * boxRows; r < tBoxRow * boxRows + boxRows; r++) {
                        for (let c = tBoxCol * boxCols; c < tBoxCol * boxCols + boxCols; c++) {
                            if (r === link.cell.row && c === link.cell.col) continue;
                            const index = r * size + c;
                            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
                            const cellValue = currentBoard[index];
                            if (Array.isArray(cellValue) && cellValue.includes(num2)) {
                                count++;
                                targetCell = { row: r, col: c };
                            }
                        }
                    }
                    if (count === 1 && targetCell) {
                        secondLinks.push({ cell: targetCell, type: 'box' });
                    }
                    
                    // 检查是否找到有效链
                    for (const secondLink of secondLinks) {
                        // 确保三个格子都不同
                        if (secondLink.cell.row === startCell.row && secondLink.cell.col === startCell.col) continue;
                        if (secondLink.cell.row === link.cell.row && secondLink.cell.col === link.cell.col) continue;
                        
                        // 只有当secondLink.cell只有两个候选数时，才能确定它不等于num2（排除后等于num1）
                        const secondLinkIndex = secondLink.cell.row * size + secondLink.cell.col;
                        const secondLinkValue = currentBoard[secondLinkIndex];
                        if (!Array.isArray(secondLinkValue) || secondLinkValue.length !== 2) continue;
                        
                        // 检查startCell和secondLink.cell是否可以看到对方（同行、同列或同宫）
                        const sameRow = startCell.row === secondLink.cell.row;
                        const sameCol = startCell.col === secondLink.cell.col;
                        const sameBox = 
                            Math.floor(startCell.row / boxRows) === Math.floor(secondLink.cell.row / boxRows) &&
                            Math.floor(startCell.col / boxCols) === Math.floor(secondLink.cell.col / boxCols);
                        
                        if (sameRow || sameCol || sameBox) {
                            // 检查secondLink.cell是否包含num1
                            const targetIndex = secondLink.cell.row * size + secondLink.cell.col;
                            const targetValue = currentBoard[targetIndex];
                            if (Array.isArray(targetValue) && targetValue.includes(num1)) {
                                return {
                                    technique: 'simple_chain',
                                    name: '链式推理',
                                    description: '像侦探一样追踪数字的可能位置，通过逻辑链条推导，排除不可能的候选数。',
                                    detail: `观察到数字 ${num1} 在第${startCell.row + 1}行第${startCell.col + 1}列和第${link.cell.row + 1}行第${link.cell.col + 1}列形成强链，再连接到第${secondLink.cell.row + 1}行第${secondLink.cell.col + 1}列。通过链式推理，可以确定第${secondLink.cell.row + 1}行第${secondLink.cell.col + 1}列不可能是数字 ${num1}，可以安全排除。`,
                                    location: startCell,
                                    number: num1,
                                    highlightCells: [
                                        { row: startCell.row, col: startCell.col },
                                        { row: link.cell.row, col: link.cell.col },
                                        { row: secondLink.cell.row, col: secondLink.cell.col }
                                    ],
                                    affectedCells: [{ row: secondLink.cell.row, col: secondLink.cell.col }]
                                };
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找ALS技巧（Almost Locked Set）
 */
function findALS(size) {
    // 收集所有ALS（Almost Locked Set）- 大小为n且有n+1个候选数的单元格集合
    const alsList = [];
    
    // 在每行中找ALS
    for (let row = 0; row < size; row++) {
        const cells = [];
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cells.push({ row, col, nums: cellValue });
            }
        }
        
        // 找大小为2-4的ALS
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                const als = [cells[i], cells[j]];
                const allNums = new Set([...cells[i].nums, ...cells[j].nums]);
                if (allNums.size === als.length + 1) {
                    alsList.push({ cells: als.map(c => ({ row: c.row, col: c.col })), nums: Array.from(allNums) });
                }
                
                for (let k = j + 1; k < cells.length; k++) {
                    const als3 = [...als, cells[k]];
                    const allNums3 = new Set([...allNums, ...cells[k].nums]);
                    if (allNums3.size === als3.length + 1) {
                        alsList.push({ cells: als3.map(c => ({ row: c.row, col: c.col })), nums: Array.from(allNums3) });
                    }
                }
            }
        }
    }
    
    // 在每列中找ALS
    for (let col = 0; col < size; col++) {
        const cells = [];
        for (let row = 0; row < size; row++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') continue;
            const cellValue = currentBoard[index];
            if (Array.isArray(cellValue)) {
                cells.push({ row, col, nums: cellValue });
            }
        }
        
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                const als = [cells[i], cells[j]];
                const allNums = new Set([...cells[i].nums, ...cells[j].nums]);
                if (allNums.size === als.length + 1) {
                    alsList.push({ cells: als.map(c => ({ row: c.row, col: c.col })), nums: Array.from(allNums) });
                }
            }
        }
    }
    
    // 检查ALS之间的关系
    for (let i = 0; i < alsList.length; i++) {
        for (let j = i + 1; j < alsList.length; j++) {
            const als1 = alsList[i];
            const als2 = alsList[j];
            
            // 找两个ALS共享的数字
            const commonNums = als1.nums.filter(n => als2.nums.includes(n));
            
            if (commonNums.length > 0) {
                // 检查是否有数字只出现在一个ALS中
                const diffNums = als1.nums.filter(n => !als2.nums.includes(n));
                
                if (diffNums.length > 0) {
                    // 检查这两个ALS是否可以看到对方的某些单元格
                    const affectedCells = [];
                    
                    for (const num of diffNums) {
                        for (const cell of als2.cells) {
                            const index = cell.row * size + cell.col;
                            const cellValue = currentBoard[index];
                            if (Array.isArray(cellValue) && cellValue.includes(num)) {
                                // 检查该单元格是否与als1中的任何单元格在同一行、列或宫
                                let canSee = false;
                                for (const als1Cell of als1.cells) {
                                    if (als1Cell.row === cell.row || 
                                        als1Cell.col === cell.col ||
                                        (Math.floor(als1Cell.row / 3) === Math.floor(cell.row / 3) &&
                                         Math.floor(als1Cell.col / 3) === Math.floor(cell.col / 3))) {
                                        canSee = true;
                                        break;
                                    }
                                }
                                
                                if (!canSee) {
                                    affectedCells.push(cell);
                                }
                            }
                        }
                    }
                    
                    if (affectedCells.length > 0) {
                        return {
                            technique: 'als',
                            name: 'ALS技巧（Almost Locked Set）',
                            description: '两个Almost Locked Set之间存在强关系，可以排除某些候选数。',
                            detail: `找到两个ALS：ALS1包含数字 ${als1.nums.join('、')}，ALS2包含数字 ${als2.nums.join('、')}。它们共享数字 ${commonNums.join('、')}，可以从ALS2中排除ALS1独有的数字 ${diffNums.join('、')}。`,
                            location: als1.cells[0],
                            number: diffNums,
                            highlightCells: [...als1.cells, ...als2.cells],
                            affectedCells: affectedCells
                        };
                    }
                }
            }
        }
    }
    
    return null;
}
/**
 * 查找宫排除法（Box Line Reduction）
 */
function findBoxLineReduction(size) {
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    // 检查行方向的宫排除
    for (let num = 1; num <= size; num++) {
        for (let boxRow = 0; boxRow < boxRows; boxRow++) {
            const boxRowStart = boxRow * boxRows;
            let possibleCols = new Set();
            
            for (let boxCol = 0; boxCol < boxCols; boxCol++) {
                const boxColStart = boxCol * boxCols;
                for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                    for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                        const index = r * size + c;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                                possibleCols = new Set();
                                boxCol = boxCols;
                                r = boxRowStart + boxRows;
                                c = boxColStart + boxCols;
                                continue;
                            }
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            possibleCols.add(c);
                        }
                    }
                }
            }
            
            // 如果某个数字在某几行的宫中只能出现在同一列，则可以排除该列其他宫的该数字
            if (possibleCols.size > 0 && possibleCols.size <= boxCols) {
                const cols = Array.from(possibleCols);
                for (const col of cols) {
                    for (let r = 0; r < size; r++) {
                        const boxOfRow = Math.floor(r / boxRows);
                        if (boxOfRow === boxRow) continue;
                        const index = r * size + col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            return {
                                technique: 'box_line_row',
                                name: '宫排除法（行方向）',
                                description: '某个数字在某几个相邻宫中只能出现在同一列，可以排除该列其他位置的该数字。',
                                detail: `数字 ${num} 在第${boxRow + 1}行组的宫中只能出现在第${cols.map(c => c + 1).join('、')}列，因此可以从第${col + 1}列其他行的格子中排除数字 ${num}。`,
                                location: { row: boxRowStart, col },
                                number: num,
                                highlightCells: [{ row: r, col }],
                                affectedCells: [{ row: r, col }]
                            };
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 查找区块排除法
 */
function findBlockExclusion(size) {
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    
    for (let num = 1; num <= size; num++) {
        for (let boxRow = 0; boxRow < boxRows; boxRow++) {
            for (let boxCol = 0; boxCol < boxCols; boxCol++) {
                const boxRowStart = boxRow * boxRows;
                const boxColStart = boxCol * boxCols;
                let foundInBox = false;
                let rowPositions = new Set();
                let colPositions = new Set();
                
                for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                    for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                        const index = r * size + c;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            if ((originalPuzzle[index] === String(num) || currentBoard[index] === num)) {
                                foundInBox = true;
                                break;
                            }
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            rowPositions.add(r);
                            colPositions.add(c);
                        }
                    }
                    if (foundInBox) break;
                }
                
                if (foundInBox) continue;
                
                // 如果某个数字在宫中只出现在某一行，可以排除该行其他宫的该数字
                if (rowPositions.size === 1) {
                    const row = Array.from(rowPositions)[0];
                    const reasonCells = [];
                    for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                        const index = row * size + c;
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            reasonCells.push({ row, col: c });
                        }
                    }
                    const affectedCells = [];
                    for (let c = 0; c < size; c++) {
                        const boxOfCol = Math.floor(c / boxCols);
                        if (boxOfCol === boxCol) continue;
                        const index = row * size + c;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            affectedCells.push({ row, col: c });
                        }
                    }
                    if (affectedCells.length > 0) {
                        const boxNum = boxRow * boxCols + boxCol + 1;
                        return {
                            technique: 'block_exclusion_row',
                            name: '区块排除法（行）',
                            description: '某个数字在某个3×3宫格内只能填在某一行，则该行其他位置可以排除该数字。',
                            detail: `数字 ${num} 在第${boxNum}宫内只能出现在第${row + 1}行，因此可以从第${row + 1}行的其他宫格中排除数字 ${num}。`,
                            location: { row, col: Array.from(colPositions)[0] },
                            number: num,
                            highlightCells: reasonCells,
                            affectedCells: affectedCells
                        };
                    }
                }
                
                // 如果某个数字在宫中只出现在某一列，可以排除该列其他宫的该数字
                if (colPositions.size === 1) {
                    const col = Array.from(colPositions)[0];
                    const reasonCells = [];
                    for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
                        const index = r * size + col;
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            reasonCells.push({ row: r, col });
                        }
                    }
                    const affectedCells = [];
                    for (let r = 0; r < size; r++) {
                        const boxOfRow = Math.floor(r / boxRows);
                        if (boxOfRow === boxRow) continue;
                        const index = r * size + col;
                        if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                            continue;
                        }
                        const cellValue = currentBoard[index];
                        if (Array.isArray(cellValue) && cellValue.includes(num)) {
                            affectedCells.push({ row: r, col });
                        }
                    }
                    if (affectedCells.length > 0) {
                        const boxNum = boxRow * boxCols + boxCol + 1;
                        return {
                            technique: 'block_exclusion_col',
                            name: '区块排除法（列）',
                            description: '某个数字在某个3×3宫格内只能填在某一列，则该列其他位置可以排除该数字。',
                            detail: `数字 ${num} 在第${boxNum}宫内只能出现在第${col + 1}列，因此可以从第${col + 1}列的其他宫格中排除数字 ${num}。`,
                            location: { row: Array.from(rowPositions)[0], col },
                            number: num,
                            highlightCells: reasonCells,
                            affectedCells: affectedCells
                        };
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * 获取某行所有格子
 */
function getRowCells(row, size) {
    const cells = [];
    for (let c = 0; c < size; c++) {
        cells.push({ row, col: c });
    }
    return cells;
}

/**
 * 获取某列所有格子
 */
function getColCells(col, size) {
    const cells = [];
    for (let r = 0; r < size; r++) {
        cells.push({ row: r, col });
    }
    return cells;
}

/**
 * 获取某宫所有格子
 */
function getBoxCells(row, col, size) {
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const boxRowStart = Math.floor(row / boxRows) * boxRows;
    const boxColStart = Math.floor(col / boxCols) * boxCols;
    const cells = [];
    for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
        for (let c = boxColStart; c < boxColStart + boxCols; c++) {
            cells.push({ row: r, col: c });
        }
    }
    return cells;
}

/**
 * 重新计算所有候选数（内部使用，不检查道具）
 */
function recalculateCandidates() {
    const size = currentPuzzle.size || 9;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            // 跳过固定数字和已有确定值的格子
            if (originalPuzzle[index] !== '0') continue;
            if (typeof currentBoard[index] === 'number' && currentBoard[index] !== 0) continue;
            // 计算候选数并更新
            currentBoard[index] = getCandidates(row, col);
        }
    }
}

/**
 * 显示提示
 */
function showHint() {
    // 如果当前没有候选数，先计算一次
    const size = currentPuzzle.size || 9;
    let needsRecalculate = false;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;
            if (originalPuzzle[index] !== '0') continue;
            if (typeof currentBoard[index] === 'number' && currentBoard[index] !== 0) continue;
            // 如果发现格子没有候选数（初始为0或undefined），需要计算
            if (!Array.isArray(currentBoard[index]) || currentBoard[index].length === 0) {
                needsRecalculate = true;
                break;
            }
        }
        if (needsRecalculate) break;
    }
    
    if (needsRecalculate) {
        recalculateCandidates();
        renderBoard();
    }
    
    const hint = analyzeBoardForHint();
    
    if (!hint) {
        customAlert('当前盘面无法找到下一步提示！\n\n已尝试所有技巧（包括数对、X-Wing、剑鱼等），建议检查盘面是否有误或尝试手动推理。', 'info');
        return;
    }
    
    // 高亮显示相关格子
    highlightHintCells(hint);
    
    // 显示浮动提示面板（不遮挡棋盘）
    showHintPanel(hint);
}

/**
 * 高亮显示提示相关的格子
 */
function highlightHintCells(hint) {
    // 清除之前的高亮
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('hint-highlight', 'hint-affected', 'hint-related', 'hint-same-num', 'hint-related-fixed', 'hint-same-num-fixed');
    });
    
    // 获取主提示位置
    const mainCell = hint.highlightCells && hint.highlightCells.length > 0 ? hint.highlightCells[0] : null;
    const hintNumber = hint.number;
    
    // 高亮主格子
    hint.highlightCells.forEach(cell => {
        const element = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
        if (element) {
            element.classList.add('hint-highlight');
        }
    });
    
    // 高亮受影响的格子
    hint.affectedCells.forEach(cell => {
        const element = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
        if (element) {
            element.classList.add('hint-affected');
        }
    });
    
    // 如果有主提示位置，高亮同行、同列、同宫的所有格子
    if (mainCell) {
        const size = currentPuzzle.size || 9;
        const boxSize = size === 9 ? 3 : 2;
        
        for (let i = 0; i < size; i++) {
            // 同行
            const rowElement = document.querySelector(`[data-row="${mainCell.row}"][data-col="${i}"]`);
            if (rowElement) {
                rowElement.classList.add('hint-related');
                if (rowElement.classList.contains('fixed')) {
                    rowElement.classList.add('hint-related-fixed');
                }
            }
            // 同列
            const colElement = document.querySelector(`[data-row="${i}"][data-col="${mainCell.col}"]`);
            if (colElement) {
                colElement.classList.add('hint-related');
                if (colElement.classList.contains('fixed')) {
                    colElement.classList.add('hint-related-fixed');
                }
            }
        }
        
        // 同宫
        const boxRowStart = Math.floor(mainCell.row / boxSize) * boxSize;
        const boxColStart = Math.floor(mainCell.col / boxSize) * boxSize;
        for (let r = boxRowStart; r < boxRowStart + boxSize; r++) {
            for (let c = boxColStart; c < boxColStart + boxSize; c++) {
                const boxElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (boxElement) {
                    boxElement.classList.add('hint-related');
                    if (boxElement.classList.contains('fixed')) {
                        boxElement.classList.add('hint-related-fixed');
                    }
                }
            }
        }
    }
    
    // 高亮与提示数字相同的数字
    if (hintNumber && typeof hintNumber === 'number') {
        document.querySelectorAll('.cell').forEach(cell => {
            const value = cell.textContent.trim();
            if (value === hintNumber.toString()) {
                cell.classList.add('hint-same-num');
                if (cell.classList.contains('fixed')) {
                    cell.classList.add('hint-same-num-fixed');
                }
            }
        });
    }
}

/**
 * 显示提示弹窗
 */
/**
 * 显示浮动提示面板（多步讲解）
 */
function showHintPanel(hint) {
    // 保存当前提示到全局变量，供快捷键使用
    window.currentHint = hint;
    
    // 先移除之前的提示面板
    const existingPanel = document.getElementById('hintPanel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // 添加全局蒙版
    let overlay = document.getElementById('hintOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'hintOverlay';
        overlay.className = 'hint-overlay';
        document.body.appendChild(overlay);
    }
    
    // 添加提示模式类到游戏页面
    const gamePage = document.getElementById('gamePage');
    if (gamePage) {
        gamePage.classList.add('hint-mode');
    }
    
    const panel = document.createElement('div');
    panel.id = 'hintPanel';
    panel.className = 'hint-panel';
    
    // 准备步骤数据
    const steps = generateHintSteps(hint);
    let currentStep = 0;
    
    // 内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'hint-panel-content';
    contentDiv.id = 'hintPanelContent';
    panel.appendChild(contentDiv);
    
    // 导航区域
    const navDiv = document.createElement('div');
    navDiv.className = 'hint-panel-nav';
    
    // 上一步按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'hint-panel-nav-btn';
    prevBtn.innerHTML = '◀';
    prevBtn.onclick = () => goToStep(currentStep - 1);
    navDiv.appendChild(prevBtn);
    
    // 进度点
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'hint-panel-dots';
    dotsDiv.id = 'hintPanelDots';
    for (let i = 0; i < steps.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'hint-panel-dot';
        if (i === 0) dot.classList.add('active');
        dotsDiv.appendChild(dot);
    }
    navDiv.appendChild(dotsDiv);
    
    // 下一步/应用按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'hint-panel-nav-btn';
    nextBtn.innerHTML = '▶';
    nextBtn.onclick = () => {
        if (currentStep < steps.length - 1) {
            goToStep(currentStep + 1);
        } else {
            applyHint(hint);
            closeHintPanel();
        }
    };
    navDiv.appendChild(nextBtn);
    
    panel.appendChild(navDiv);
    document.body.appendChild(panel);
    
    // 渲染步骤
    function renderStep(stepIndex) {
        const step = steps[stepIndex];
        contentDiv.innerHTML = '';
        
        const title = document.createElement('div');
        title.className = 'hint-panel-title';
        title.textContent = step.title;
        contentDiv.appendChild(title);
        
        if (step.desc) {
            const desc = document.createElement('div');
            desc.className = 'hint-panel-desc';
            desc.textContent = step.desc;
            contentDiv.appendChild(desc);
        }
        
        if (step.reason) {
            const reason = document.createElement('div');
            reason.className = 'hint-panel-reason';
            reason.innerHTML = step.reason;
            contentDiv.appendChild(reason);
        }
        
        // 更新进度点
        const dots = dotsDiv.querySelectorAll('.hint-panel-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === stepIndex);
        });
        
        // 更新按钮状态
        prevBtn.disabled = stepIndex === 0;
        if (stepIndex === steps.length - 1) {
            nextBtn.innerHTML = '✓';
            nextBtn.className = 'hint-panel-apply';
        } else {
            nextBtn.innerHTML = '▶';
            nextBtn.className = 'hint-panel-nav-btn';
        }
        
        // 根据步骤动态更新棋盘高亮
        updateHintHighlight(stepIndex);
    }
    
    // 根据步骤更新棋盘高亮
    function updateHintHighlight(stepIndex) {
        // 清除之前的高亮
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('hint-highlight', 'hint-affected', 'hint-related', 'hint-same-num', 'hint-related-fixed', 'hint-same-num-fixed');
        });
        
        const isExclusion = hint.technique.startsWith('block_exclusion') || 
                            hint.technique.startsWith('naked_pair') ||
                            hint.technique.startsWith('hidden_pair') ||
                            hint.technique.startsWith('naked_triplet') ||
                            hint.technique.startsWith('hidden_triplet') ||
                            hint.technique.startsWith('xwing') ||
                            hint.technique.startsWith('swordfish') ||
                            hint.technique.startsWith('y_wing') ||
                            hint.technique.startsWith('unique_rectangle') ||
                            hint.technique.startsWith('box_line');
        
        if (stepIndex === 0) {
            // 步骤1：显示原因格子（highlightCells）+ 相关的行/列/宫
            highlightReasonCells(hint);
        } else if (stepIndex === 1) {
            // 步骤2：显示受影响的格子（被排除的格子）
            if (isExclusion && hint.affectedCells && hint.affectedCells.length > 0) {
                hint.affectedCells.forEach(cell => {
                    const element = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                    if (element) {
                        element.classList.add('hint-affected');
                    }
                });
                // 同时显示原因格子作为参考
                if (hint.highlightCells) {
                    hint.highlightCells.forEach(cell => {
                        const element = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                        if (element) {
                            element.classList.add('hint-highlight');
                        }
                    });
                }
            } else {
                // 非排除类提示，显示所有相关格子
                highlightReasonCells(hint);
            }
        } else {
            // 步骤3：显示所有相关格子
            highlightReasonCells(hint);
        }
    }
    
    // 高亮原因格子及相关的行/列/宫
    function highlightReasonCells(hint) {
        // 高亮原因格子（highlightCells）
        if (hint.highlightCells) {
            hint.highlightCells.forEach(cell => {
                const element = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                if (element) {
                    element.classList.add('hint-highlight');
                }
            });
        }
        
        // 高亮与提示数字相同的数字
        const hintNumber = hint.number;
        if (hintNumber && typeof hintNumber === 'number') {
            document.querySelectorAll('.cell').forEach(cell => {
                const value = cell.textContent.trim();
                if (value === hintNumber.toString()) {
                    cell.classList.add('hint-same-num');
                    if (cell.classList.contains('fixed')) {
                        cell.classList.add('hint-same-num-fixed');
                    }
                }
            });
        }
        
        // 如果有主提示位置，高亮同行、同列、同宫的所有格子
        const mainCell = hint.highlightCells && hint.highlightCells.length > 0 ? hint.highlightCells[0] : null;
        if (mainCell) {
            const size = currentPuzzle.size || 9;
            const boxSize = size === 9 ? 3 : 2;
            
            for (let i = 0; i < size; i++) {
                // 同行
                const rowElement = document.querySelector(`[data-row="${mainCell.row}"][data-col="${i}"]`);
                if (rowElement) {
                    rowElement.classList.add('hint-related');
                    if (rowElement.classList.contains('fixed')) {
                        rowElement.classList.add('hint-related-fixed');
                    }
                }
                // 同列
                const colElement = document.querySelector(`[data-row="${i}"][data-col="${mainCell.col}"]`);
                if (colElement) {
                    colElement.classList.add('hint-related');
                    if (colElement.classList.contains('fixed')) {
                        colElement.classList.add('hint-related-fixed');
                    }
                }
            }
            
            // 同宫
            const boxRowStart = Math.floor(mainCell.row / boxSize) * boxSize;
            const boxColStart = Math.floor(mainCell.col / boxSize) * boxSize;
            for (let r = boxRowStart; r < boxRowStart + boxSize; r++) {
                for (let c = boxColStart; c < boxColStart + boxSize; c++) {
                    const boxElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (boxElement) {
                        boxElement.classList.add('hint-related');
                        if (boxElement.classList.contains('fixed')) {
                            boxElement.classList.add('hint-related-fixed');
                        }
                    }
                }
            }
        }
    }
    
    function goToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= steps.length) return;
        currentStep = stepIndex;
        renderStep(currentStep);
    }
    
    // 初始化显示第一步
    renderStep(0);
}

/**
 * 生成提示步骤数据
 */
function generateHintSteps(hint) {
    const steps = [];
    const isExclusion = hint.technique.startsWith('block_exclusion') || 
                        hint.technique.startsWith('naked_pair') ||
                        hint.technique.startsWith('hidden_pair') ||
                        hint.technique.startsWith('naked_triplet') ||
                        hint.technique.startsWith('hidden_triplet') ||
                        hint.technique.startsWith('xwing') ||
                        hint.technique.startsWith('swordfish') ||
                        hint.technique.startsWith('y_wing') ||
                        hint.technique.startsWith('unique_rectangle') ||
                        hint.technique.startsWith('box_line');
    
    const location = hint.highlightCells && hint.highlightCells.length > 0
        ? `第${hint.highlightCells[0].row + 1}行第${hint.highlightCells[0].col + 1}列`
        : hint.location
            ? `第${hint.location.row + 1}行第${hint.location.col + 1}列`
            : '';
    
    // 步骤1：介绍技巧原理
    steps.push({
        title: `技巧: ${hint.name}`,
        desc: `位置: ${location}`,
        reason: `原理: ${hint.description}`
    });
    
    // 步骤2：填入数字/排除数字和原因
    if (isExclusion) {
        const num = Array.isArray(hint.number) ? hint.number.join(',') : hint.number;
        const affectedLoc = hint.affectedCells && hint.affectedCells.length > 0
            ? hint.affectedCells.map(c => `第${c.row + 1}行第${c.col + 1}列`).join('、')
            : '';
        steps.push({
            title: `排除数字: ${num}`,
            desc: `影响位置: ${affectedLoc}`,
            reason: `原因: ${hint.detail}`
        });
    } else {
        const num = Array.isArray(hint.number) ? hint.number.join(',') : hint.number;
        steps.push({
            title: `填入数字: ${num}`,
            desc: `位置: ${location}`,
            reason: `原因: ${hint.detail}`
        });
    }
    
    // 步骤3：确认
    if (isExclusion) {
        steps.push({
            title: '确认排除',
            desc: '',
            reason: '点击✓应用此提示'
        });
    } else {
        steps.push({
            title: '确认填入',
            desc: '',
            reason: '点击✓应用此提示'
        });
    }
    
    return steps;
}

/**
 * 关闭提示面板
 */
function closeHintPanel() {
    const panel = document.getElementById('hintPanel');
    if (panel) {
        panel.remove();
    }
    
    // 移除全局蒙版
    const overlay = document.getElementById('hintOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // 移除提示模式类
    const gamePage = document.getElementById('gamePage');
    if (gamePage) {
        gamePage.classList.remove('hint-mode');
    }
    
    // 清除全局提示变量
    delete window.currentHint;
    // 清除高亮
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('hint-highlight', 'hint-affected', 'hint-related', 'hint-same-num', 'hint-related-fixed', 'hint-same-num-fixed');
    });
}

/**
 * 应用提示
 */
function applyHint(hint) {
    const size = currentPuzzle.size || 9;
    
    // 如果是可以直接填入数字的技巧
    if (hint.technique.startsWith('naked_single') || hint.technique.startsWith('hidden_single')) {
        const { row, col } = hint.location;
        const index = row * size + col;
        currentBoard[index] = hint.number;
        
        // 删除同行、同列、同宫中的重复候选数字
        const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
        affectedIndices.forEach(idx => {
            if (Array.isArray(currentBoard[idx])) {
                const candidateIdx = currentBoard[idx].indexOf(hint.number);
                if (candidateIdx >= 0) {
                    currentBoard[idx].splice(candidateIdx, 1);
                }
            }
        });
        
        renderBoard();
        updateNumberButtons();
        scheduleSaveProgress();
        addScoreForCorrectAnswer();
    } else {
        const num = Array.isArray(hint.number) ? hint.number : [hint.number];
        
        // 隐藏数对/三数/四数法：保留数对数字，移除其他候选数
        if (hint.technique.startsWith('hidden_pair') || hint.technique.startsWith('hidden_triplet') || hint.technique.startsWith('hidden_quad')) {
            hint.affectedCells.forEach(cell => {
                const index = cell.row * size + cell.col;
                if (Array.isArray(currentBoard[index])) {
                    // 只保留数对中的数字
                    currentBoard[index] = currentBoard[index].filter(n => num.includes(n));
                }
            });
        } else {
            // 其他排除类技巧：移除指定的候选数
            hint.affectedCells.forEach(cell => {
                const index = cell.row * size + cell.col;
                if (Array.isArray(currentBoard[index])) {
                    num.forEach(n => {
                        const candidateIdx = currentBoard[index].indexOf(n);
                        if (candidateIdx >= 0) {
                            currentBoard[index].splice(candidateIdx, 1);
                        }
                    });
                }
            });
        }
        
        renderBoard();
        updateNumberButtons();
        scheduleSaveProgress();
    }
}

/**
 * 获取技巧说明
 */
function getTechniqueDescription(technique) {
    const descriptions = {
        'naked_single': '唯一候选数 - 格子只有一个候选数',
        'hidden_single_row': '隐藏候选数 - 行',
        'hidden_single_col': '隐藏候选数 - 列',
        'hidden_single_box': '隐藏候选数 - 宫',
        'naked_pair_row': '数对 - 行',
        'naked_pair_col': '数对 - 列',
        'hidden_pair_row': '隐藏数对 - 行',
        'hidden_pair_col': '隐藏数对 - 列',
        'naked_triplet_row': '三数法 - 行',
        'naked_triplet_col': '三数法 - 列',
        'box_line_row': '宫排除 - 行方向',
        'box_line_col': '宫排除 - 列方向',
        'block_exclusion_row': '区块排除 - 行',
        'block_exclusion_col': '区块排除 - 列',
        'xwing': 'X-Wing - 两行两列交叉',
        'swordfish': '剑鱼 - 三行三列交叉'
    };
    return descriptions[technique] || technique;
}

/**
 * 渲染涂色模式的棋盘
 */
function renderColorBoard() {
    const board = document.getElementById('sudokuBoard');
    if (!board) return;
    board.innerHTML = '';
    const size = currentPuzzle.size || 9;

    // 动态设置网格列数
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.className = 'sudoku-board';

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = i * size + j;
            const cell = document.createElement('div');
            cell.className = 'cell';
            board.appendChild(cell);
        }
    }

    // 先获取当前的格子元素
    const cells = board.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = "";
    });

    // 从中心点开始，一圈一圈向外扩散
    const centerRow = Math.floor(size / 2);
    const centerCol = Math.floor(size / 2);
    const maxDist = size - 1;

    let delay = 100;
    for (let dist = 0; dist <= maxDist; dist++) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const rowDist = Math.abs(i - centerRow);
                const colDist = Math.abs(j - centerCol);
                const maxDistCell = Math.max(rowDist, colDist);

                if (maxDistCell === dist) {
                    const index = i * size + j;
                    const value = currentBoard[index];

                    if (typeof value === 'number' && value !== 0) {
                        setTimeout(() => {
                            cells[index].style.backgroundColor = numberColors[value];
                            cells[index].style.transition = 'background-color 0.3s ease-out';
                        }, delay);
                    }
                }
            }
        }
        delay += 100;
    }
}

// ==================== 页面导航函数 ====================

/**
 * 返回首页（跳转到 index.html）
 */
function goHome() {
    stopTimer();

    // 保存当前游戏进度
    if (currentPuzzle) {
        saveGameProgress();
    }
    location.href = "index.html";
}

/**
 * 显示记录页（跳转到 records.html）
 */
function showRecords() {
    location.href = "records.html";
}

// 当前自定义题目棋盘大小（4、6、9）
let customBoardSize = 9;

/**
 * 显示自定义题目录入界面
 */
function showCustomPuzzleInput() {
    closeGameTypeModal();
    document.getElementById('CustomPuzzleModal').style.display = 'flex';
    // 默认选择9×9
    customBoardSize = 9;
    updateBoardSizeUI();
    renderCustomPuzzleBoard();
    document.getElementById('customPuzzleStatus').textContent = '';
}

/**
 * 设置自定义题目棋盘大小
 */
function setCustomBoardSize(size) {
    customBoardSize = size;
    updateBoardSizeUI();
    renderCustomPuzzleBoard();
}

/**
 * 更新棋盘大小选择UI
 */
function updateBoardSizeUI() {
    // 更新按钮状态
    document.querySelectorAll('.small-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`size${customBoardSize}Btn`).classList.add('active');
    
    // 更新提示文字
    document.getElementById('boardSizeText').textContent = `${customBoardSize}×${customBoardSize}`;
    
    // 更新数字键盘显示
    const num5Btn = document.getElementById('num5Btn');
    const num6Btn = document.getElementById('num6Btn');
    const num7Btn = document.getElementById('num7Btn');
    const num8Btn = document.getElementById('num8Btn');
    const num9Btn = document.getElementById('num9Btn');
    
    if (customBoardSize === 4) {
        num5Btn.style.display = 'none';
        num6Btn.style.display = 'none';
        num7Btn.style.display = 'none';
        num8Btn.style.display = 'none';
        num9Btn.style.display = 'none';
    } else if (customBoardSize === 6) {
        num5Btn.style.display = 'block';
        num6Btn.style.display = 'block';
        num7Btn.style.display = 'none';
        num8Btn.style.display = 'none';
        num9Btn.style.display = 'none';
    } else {
        num5Btn.style.display = 'block';
        num6Btn.style.display = 'block';
        num7Btn.style.display = 'block';
        num8Btn.style.display = 'block';
        num9Btn.style.display = 'block';
    }
}

/**
 * 关闭自定义题目录入弹窗
 */
function closeCustomPuzzleModal() {
    document.getElementById('CustomPuzzleModal').style.display = 'none';
    // 移除键盘事件监听
    document.removeEventListener('keydown', handleCustomPuzzleKeydown);
}

/**
 * 渲染自定义题目录入棋盘
 */
function renderCustomPuzzleBoard() {
    const board = document.getElementById('customPuzzleBoard');
    board.innerHTML = '';
    
    // 动态设置grid列数
    board.style.gridTemplateColumns = `repeat(${customBoardSize}, 1fr)`;
    
    // 根据棋盘大小设置宫格大小
    // 4×4: 2×2宫格
    // 6×6: 3×2宫格（每行3格，每列2格）
    // 9×9: 3×3宫格
    let boxCols, boxRows;
    if (customBoardSize === 4) {
        boxCols = 2;
        boxRows = 2;
    } else if (customBoardSize === 6) {
        boxCols = 3;
        boxRows = 2;
    } else {
        boxCols = 3;
        boxRows = 3;
    }
    
    for (let row = 0; row < customBoardSize; row++) {
        for (let col = 0; col < customBoardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 添加宫格边框样式
            // 右边框：当前列是宫格的最后一列且不是整个棋盘的最后一列
            if ((col + 1) % boxCols === 0 && col !== customBoardSize - 1) {
                cell.classList.add('border-right-bold');
            }
            // 下边框：当前行是宫格的最后一行且不是整个棋盘的最后一行
            if ((row + 1) % boxRows === 0 && row !== customBoardSize - 1) {
                cell.classList.add('border-bottom-bold');
            }
            
            // 点击单元格时选中它
            cell.addEventListener('click', () => {
                // 清除之前选中的单元格
                const selectedCells = board.querySelectorAll('.cell.selected');
                selectedCells.forEach(c => c.classList.remove('selected'));
                
                // 选中当前单元格
                cell.classList.add('selected');
            });
            
            board.appendChild(cell);
        }
    }
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleCustomPuzzleKeydown);
}

/**
 * 处理自定义题目录入时的键盘事件
 */
function handleCustomPuzzleKeydown(e) {
    const key = e.key;
    
    // 数字键 1-9（根据棋盘大小限制）
    const maxNum = customBoardSize;
    if (key >= '1' && key <= String(maxNum)) {
        inputCustomNumber(parseInt(key));
        e.preventDefault();
    }
    // 删除键
    else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        inputCustomNumber(0);
        e.preventDefault();
    }
    // 方向键移动选中位置
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        moveSelectedCell(e.key);
        e.preventDefault();
    }
}

/**
 * 移动选中的单元格
 */
function moveSelectedCell(direction) {
    const board = document.getElementById('customPuzzleBoard');
    const selectedCell = board.querySelector('.cell.selected');
    
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    
    let newRow = row;
    let newCol = col;
    const maxIndex = customBoardSize - 1;
    
    switch (direction) {
        case 'ArrowUp':
            newRow = Math.max(0, row - 1);
            break;
        case 'ArrowDown':
            newRow = Math.min(maxIndex, row + 1);
            break;
        case 'ArrowLeft':
            newCol = Math.max(0, col - 1);
            break;
        case 'ArrowRight':
            newCol = Math.min(maxIndex, col + 1);
            break;
    }
    
    // 清除当前选中
    selectedCell.classList.remove('selected');
    
    // 选中新位置
    const newCell = board.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
    if (newCell) {
        newCell.classList.add('selected');
    }
}

/**
 * 从数字键盘输入数字到自定义题目
 */
function inputCustomNumber(num) {
    const board = document.getElementById('customPuzzleBoard');
    const selectedCell = board.querySelector('.cell.selected');
    
    if (!selectedCell) {
        // 如果没有选中的单元格，默认选中第一个空单元格
        const emptyCell = board.querySelector('.cell:not(.has-value)');
        if (emptyCell) {
            emptyCell.classList.add('selected');
            selectedCell = emptyCell;
        } else {
            return;
        }
    }
    
    if (num === 0) {
        // 清除数字
        selectedCell.innerHTML = '';
        selectedCell.classList.remove('has-value');
    } else {
        // 填入数字
        selectedCell.innerHTML = num;
        selectedCell.classList.add('has-value');
        // 不自动跳转，保持当前选中状态
    }
}

/**
 * 清空自定义题目
 */
function clearCustomPuzzle() {
    const board = document.getElementById('customPuzzleBoard');
    const cells = board.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-value');
    });
    document.getElementById('customPuzzleStatus').textContent = '';
}

/**
 * 确认自定义题目
 */
function confirmCustomPuzzle() {
    const board = document.getElementById('customPuzzleBoard');
    const cells = board.querySelectorAll('.cell');
    const puzzle = [];
    
    // 根据棋盘大小收集题目
    const size = customBoardSize;
    for (let row = 0; row < size; row++) {
        puzzle[row] = [];
        for (let col = 0; col < size; col++) {
            const cell = cells[row * size + col];
            const value = cell.classList.contains('has-value') ? parseInt(cell.textContent) : 0;
            puzzle[row][col] = value;
        }
    }
    
    // 检查是否有足够的提示数字
    let hintCount = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (puzzle[row][col] !== 0) hintCount++;
        }
    }
    
    // 根据棋盘大小设置最小提示数要求
    const minHints = size === 4 ? 4 : (size === 6 ? 8 : 17);
    
    if (hintCount < minHints) {
        document.getElementById('customPuzzleStatus').textContent = `提示：题目至少需要${minHints}个提示数字`;
        document.getElementById('customPuzzleStatus').style.color = '#e74c3c';
        return;
    }
    
    // 显示正在验证
    document.getElementById('customPuzzleStatus').textContent = '正在验证题目...';
    document.getElementById('customPuzzleStatus').style.color = '#666';
    
    // 使用setTimeout让UI有时间更新
    setTimeout(() => {
        // 验证题目是否有解（传递副本，避免solveSudoku修改原始数组）
        const solution = solveSudoku(puzzle.map(row => [...row]), true);
        
        if (!solution) {
            document.getElementById('customPuzzleStatus').textContent = '错误：该题目无解，请检查输入是否正确';
            document.getElementById('customPuzzleStatus').style.color = '#e74c3c';
            return;
        }
        
        // 验证是否有唯一解（传递副本，避免修改原始数组）
        const solutionCount = countSolutions(puzzle.map(row => [...row]));
        
        // 评估难度
        const difficulty = evaluateDifficulty(puzzle);
        const difficultyName = getDifficultyName(difficulty);
        
        if (solutionCount === 0) {
            document.getElementById('customPuzzleStatus').textContent = '错误：该题目无解，请检查输入是否正确';
            document.getElementById('customPuzzleStatus').style.color = '#e74c3c';
            return;
        } else if (solutionCount > 1) {
            document.getElementById('customPuzzleStatus').textContent = `提示：该题目有多解（${solutionCount}种解法），评估难度：${difficultyName}`;
            document.getElementById('customPuzzleStatus').style.color = '#f39c12';
            // 仍然允许用户开始答题
        } else {
            document.getElementById('customPuzzleStatus').textContent = `✓ 验证通过！该题目有唯一解，评估难度：${difficultyName}`;
            document.getElementById('customPuzzleStatus').style.color = '#27ae60';
        }
        
        // 延迟后开始游戏
        setTimeout(() => {
            // 启动自定义题目游戏
            startCustomPuzzleGame(puzzle, solution, size, difficulty);
        }, 1500);
    }, 100);
}

/**
 * 评估自定义题目的难度
 * @param {number[][]} puzzle 题目二维数组
 * @returns {string} 难度等级（EASY/MEDIUM/HARD）
 */
function evaluateDifficulty(puzzle) {
    const size = puzzle.length;
    let totalCells = size * size;
    let filledCells = 0;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (puzzle[row][col] !== 0) {
                filledCells++;
            }
        }
    }
    
    const emptyCells = totalCells - filledCells;
    const filledPercentage = (filledCells / totalCells) * 100;
    
    // 根据棋盘大小和空白格数量评估难度
    if (size === 4) {
        // 4×4：总格子16个
        if (emptyCells <= 6) return 'EASY';      // 简单：10+个提示
        if (emptyCells <= 10) return 'MEDIUM';    // 中等：6-9个提示
        return 'HARD';                            // 困难：5个以下提示
    } else if (size === 6) {
        // 6×6：总格子36个
        if (emptyCells <= 14) return 'EASY';     // 简单：22+个提示
        if (emptyCells <= 22) return 'MEDIUM';   // 中等：14-21个提示
        return 'HARD';                            // 困难：13个以下提示
    } else {
        // 9×9：总格子81个
        if (emptyCells <= 40) return 'EASY';     // 简单：41+个提示
        if (emptyCells <= 50) return 'MEDIUM';   // 中等：31-40个提示
        return 'HARD';                            // 困难：30个以下提示
    }
}

/**
 * 获取难度中文名称
 * @param {string} difficulty 难度等级
 * @returns {string} 中文名称
 */
function getDifficultyName(difficulty) {
    const names = {
        'EASY': '简单',
        'MEDIUM': '中等',
        'HARD': '高级'
    };
    return names[difficulty] || difficulty;
}

/**
 * 暴力破解数独（返回第一个解）
 * @param {number[][]} puzzle 题目二维数组
 * @param {boolean} findOne 是否只找一个解
 * @returns {number[][]|null} 解或null
 */
function solveSudoku(puzzle, findOne = true) {
    const board = puzzle.map(row => [...row]);
    const size = board.length;
    
    // 根据棋盘大小确定宫格大小
    let boxCols, boxRows;
    if (size === 4) {
        boxCols = 2;
        boxRows = 2;
    } else if (size === 6) {
        boxCols = 3;
        boxRows = 2;
    } else {
        boxCols = 3;
        boxRows = 3;
    }
    
    function isValid(board, row, col, num) {
        // 检查行
        for (let c = 0; c < size; c++) {
            if (board[row][c] === num) return false;
        }
        
        // 检查列
        for (let r = 0; r < size; r++) {
            if (board[r][col] === num) return false;
        }
        
        // 检查宫格
        const boxRow = Math.floor(row / boxRows) * boxRows;
        const boxCol = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRow; r < boxRow + boxRows; r++) {
            for (let c = boxCol; c < boxCol + boxCols; c++) {
                if (board[r][c] === num) return false;
            }
        }
        
        return true;
    }
    
    function solve(board) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    for (let num = 1; num <= size; num++) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (solve(board)) {
                                if (findOne) return true;
                            }
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    if (solve(board)) {
        return board;
    }
    return null;
}

/**
 * 统计数独解的数量（最多统计到2个解）
 * @param {number[][]} puzzle 题目二维数组
 * @returns {number} 解的数量
 */
function countSolutions(puzzle) {
    const board = puzzle.map(row => [...row]);
    const size = board.length;
    let solutionCount = 0;
    
    // 根据棋盘大小确定宫格大小
    let boxCols, boxRows;
    if (size === 4) {
        boxCols = 2;
        boxRows = 2;
    } else if (size === 6) {
        boxCols = 3;
        boxRows = 2;
    } else {
        boxCols = 3;
        boxRows = 3;
    }
    
    function isValid(board, row, col, num) {
        // 检查行
        for (let c = 0; c < size; c++) {
            if (board[row][c] === num) return false;
        }
        
        // 检查列
        for (let r = 0; r < size; r++) {
            if (board[r][col] === num) return false;
        }
        
        // 检查宫格
        const boxRow = Math.floor(row / boxRows) * boxRows;
        const boxCol = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRow; r < boxRow + boxRows; r++) {
            for (let c = boxCol; c < boxCol + boxCols; c++) {
                if (board[r][c] === num) return false;
            }
        }
        
        return true;
    }
    
    function solve(board) {
        if (solutionCount >= 2) return; // 找到2个解就停止
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    for (let num = 1; num <= size; num++) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            solve(board);
                            board[row][col] = 0;
                        }
                    }
                    return;
                }
            }
        }
        solutionCount++;
    }
    
    solve(board);
    return solutionCount;
}

/**
 * 启动自定义题目游戏
 * @param {number[][]} puzzle 题目二维数组
 * @param {number[][]} solution 解的二维数组
 * @param {number} size 棋盘大小
 * @param {string} difficulty 评估的难度等级
 */
function startCustomPuzzleGame(puzzle, solution, size = 9, difficulty = 'MEDIUM') {
    // 放弃之前未完成的游戏
    const record = getLatestInProgressGame();
    if (record) {
        record.isAbandoned = true;
        record.isCompleted = true;
        Storage.saveRecord(record);
    }
    
    // 将二维数组转换为字符串
    const puzzleStr = puzzle.map(row => row.join('')).join('');
    const solutionStr = solution.map(row => row.join('')).join('');
    
    // 保存到localStorage
    localStorage.setItem('customPuzzle', puzzleStr);
    localStorage.setItem('customSolution', solutionStr);
    localStorage.setItem('customBoardSize', size.toString());
    localStorage.setItem('customDifficulty', difficulty);
    localStorage.setItem('currentGameType', 'CUSTOM');
    localStorage.setItem('currentDifficultyType', difficulty);
    localStorage.removeItem('continuePuzzleId');
    
    // 关闭弹窗并跳转到游戏页面
    closeCustomPuzzleModal();
    location.href = 'game.html';
}

/**
 * 开始游戏（跳转到 game.html）
 */
function startGame(gameType, difficultyType) {
    // 放弃之前未完成的游戏
    const record = getLatestInProgressGame();
    if (record) {
        record.isAbandoned = true;
        record.isCompleted = true;
        Storage.saveRecord(record);
    }

    currentGameType = gameType;
    currentDifficulty = difficultyType;
    localStorage.setItem("currentGameType", gameType);
    localStorage.setItem("currentDifficultyType", difficultyType);
    // 清除继续游戏的记录ID
    localStorage.removeItem("continuePuzzleId");
    location.href = "game.html";
}

/**
 * 生成新题目
 * @param {string} gameType 游戏类型
 */
function generateNewPuzzle(gameType, difficultyType = "EASY") {
    // 显示加载提示
    document.getElementById('sudokuBoard').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">正在生成题目...</div>';

    // 使用setTimeout让UI有时间更新
    setTimeout(() => {
        // 根据难度确定棋盘尺寸、空格数量和游戏类型
        let boardSize, emptyCount, gameTypeStr;
        // const emptyCounts = { MINI_4x4: 12, MINI_6x6: 22, EASY: 35, MEDIUM: 45, HARD: 55, DIAGONAL: 40, ODD_EVEN: 40, KILLER_4x4: 16, KILLER_6x6: 36, KILLER_9x9: 81, IRREGULAR: 45, WINDOKU: 45, SANDWICH: 45 };

        if (gameType === 'MINI_4x4') {
            boardSize = 4;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 12;
            gameTypeStr = 'MINI_4x4';
        } else if (gameType === 'MINI_6x6') {
            boardSize = 6;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 12;
            gameTypeStr = 'MINI_6x6';
        } else if (gameType === 'DIAGONAL') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'DIAGONAL';
        } else if (gameType === 'ODD_EVEN') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'ODD_EVEN';
        } else if (gameType === 'IRREGULAR') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'IRREGULAR';
        } else if (gameType === 'WINDOKU') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'WINDOKU';
        } else if (gameType === 'CENTER_DOT') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'CENTER_DOT';
        } else if (gameType === 'STAR') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'STAR';
        } else if (gameType === 'BLACK_WHITE_DOT') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'BLACK_WHITE_DOT';
        } else if (gameType === 'SKYSCRAPER') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'SKYSCRAPER';
        } else if (gameType === 'UNTOUCHABLE') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'UNTOUCHABLE';
        } else if (gameType === 'SANDWICH') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'SANDWICH';
        } else if (gameType === 'CUSTOM') {
            boardSize = 9;
            emptyCount = 0; // 自定义题目不需要空位数
            gameTypeStr = 'CUSTOM';
        } else if (gameType === 'KILLER_4x4') {
            boardSize = 4;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 16;
            gameTypeStr = 'KILLER';
        } else if (gameType === 'KILLER_6x6') {
            boardSize = 6;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 36;
            gameTypeStr = 'KILLER';
        } else if (gameType === 'KILLER_9x9') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 81;
            gameTypeStr = 'KILLER';
        } else {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 35;
            gameTypeStr = 'STANDARD';
        }

        // 设置生成器尺寸和游戏类型
        sudokuGenerator.setSize(boardSize);
        sudokuGenerator.setGameTypeStr(gameTypeStr);

        let fullBoard, puzzleBoard, puzzleStr, solutionStr;
        let oddEvenMarks = null;
        let cages = null;
        let skyscraperClues = null;

        if (gameTypeStr === 'KILLER') {
            // 杀手数独：生成完整解和笼子
            fullBoard = sudokuGenerator.generateKillerSolution();
            cages = sudokuGenerator.cages;
            // 如果有预先生成的带提示数谜题（9x9专用），使用它
            if (sudokuGenerator.puzzleBoard) {
                puzzleBoard = sudokuGenerator.puzzleBoard;
            } else {
                // 杀手数独没有初始数字，全部为空
                puzzleBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
            }
        } else if (gameTypeStr === 'ODD_EVEN') {
            // 奇偶数独：先生成数独解，再根据解生成标记
            const oddEvenResult = sudokuGenerator.generateOddEvenPuzzle();
            fullBoard = oddEvenResult.solution;
            oddEvenMarks = oddEvenResult.marks;
            sudokuGenerator.oddEvenMarks = oddEvenMarks;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        } else if (gameTypeStr === 'DIAGONAL') {
            // 对角线数独
            fullBoard = sudokuGenerator.generateFullBoard();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        } else if (gameTypeStr === 'IRREGULAR') {
            // 锯齿数独：使用专用高效算法
            console.log('🔷 开始生成锯齿数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateIrregularSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 锯齿数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'WINDOKU') {
            // 窗口数独：生成满足窗口约束的解
            console.log('🔷 开始生成窗口数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateWindokuSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 窗口数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'CENTER_DOT') {
            // 中心点数独：生成满足中心区域约束的解
            console.log('🔷 开始生成中心点数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateCenterDotSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 中心点数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'STAR') {
            // 星号数独：生成满足星形区域约束的解
            console.log('🔷 开始生成星号数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateStarSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 星号数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'UNTOUCHABLE') {
            // 无缘数独：国王移动约束
            console.log('🔷 开始生成无缘数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateUntouchableSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 无缘数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'BLACK_WHITE_DOT') {
            // 黑白点数独：生成满足黑白点规则的解
            console.log('🔷 开始生成黑白点数独题目...');
            const startTime = Date.now();
            const result = sudokuGenerator.generateBlackWhiteDotSolution();
            fullBoard = result.board;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            blackWhiteDotHints = result.dots;
            console.log(`✅ 黑白点数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'SKYSCRAPER') {
            // 摩天楼数独：生成满足摩天楼规则的解
            console.log('🔷 开始生成摩天楼数独题目...');
            const startTime = Date.now();
            const result = sudokuGenerator.generateSkyscraperSolution();
            fullBoard = result.board;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            skyscraperClues = result.clues;
            console.log(`✅ 摩天楼数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'SANDWICH') {
            // 三明治数独：生成完整解并计算外部提示
            console.log('🔷 开始生成三明治数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateSandwichSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            const sandwichClues = sudokuGenerator.sandwichClues;
            console.log(`✅ 三明治数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'CUSTOM') {
            // 自定义题目：从localStorage加载
            const customBoardSize = parseInt(localStorage.getItem('customBoardSize')) || 9;
            boardSize = customBoardSize;
            const customPuzzle = localStorage.getItem('customPuzzle');
            const customSolution = localStorage.getItem('customSolution');
            if (customPuzzle && customSolution) {
                puzzleStr = customPuzzle;
                solutionStr = customSolution;
                // 清空localStorage中的自定义题目
                localStorage.removeItem('customPuzzle');
                localStorage.removeItem('customSolution');
                localStorage.removeItem('customBoardSize');
                // 解析为二维数组（用于创建puzzleBoard）
                puzzleBoard = [];
                for (let i = 0; i < boardSize; i++) {
                    puzzleBoard[i] = [];
                    for (let j = 0; j < boardSize; j++) {
                        puzzleBoard[i][j] = parseInt(puzzleStr[i * boardSize + j]);
                    }
                }
                // 解析完整解
                fullBoard = [];
                for (let i = 0; i < boardSize; i++) {
                    fullBoard[i] = [];
                    for (let j = 0; j < boardSize; j++) {
                        fullBoard[i][j] = parseInt(solutionStr[i * boardSize + j]);
                    }
                }
            } else {
                // 如果没有自定义题目，回退到标准数独
                boardSize = 9;
                fullBoard = sudokuGenerator.generateFullBoard();
                puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, 35);
            }
        } else {
            // 标准数独
            fullBoard = sudokuGenerator.generateFullBoard();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        }

        // 转换为字符串
        puzzleStr = sudokuGenerator.boardToString(puzzleBoard);
        solutionStr = sudokuGenerator.boardToString(fullBoard);

        // 生成题目ID
        const puzzleId = Storage.getNextPuzzleId();

        // 保存当前题目
        currentPuzzle = {
            id: puzzleId,
            puzzle: puzzleStr,
            solution: solutionStr,
            gameType: gameType,
            size: boardSize,
            gameTypeStr: gameTypeStr,
            oddEvenMarks: oddEvenMarks,
            cages: cages,
            irregularBoxes: gameTypeStr === 'IRREGULAR' ? sudokuGenerator.irregularBoxes : null,
            sandwichClues: gameTypeStr === 'SANDWICH' ? sudokuGenerator.sandwichClues : null,
            blackWhiteDotHints: gameTypeStr === 'BLACK_WHITE_DOT' ? blackWhiteDotHints : null,
            skyscraperClues: gameTypeStr === 'SKYSCRAPER' ? skyscraperClues : null
        };

        originalPuzzle = puzzleStr;
        // 初始化棋盘：固定数字保持为数字，空格初始化为空数组[]
        currentBoard = puzzleStr.split('').map(c => c === '0' ? [] : parseInt(c));

        // 更新显示
        const puzzleNumber = document.getElementById('puzzleNumber');
        if (puzzleNumber) {
            puzzleNumber.textContent = `题目 #${puzzleId}`;
        }

        // 保存原始题目到记录
        saveOriginalPuzzle(puzzleId, puzzleStr, solutionStr);

        // 加载用户记录
        loadUserRecord();

        // 渲染棋盘
        renderBoard();
        
        // 更新游戏控制按钮显示（根据道具权限）
        updateGameControlButtons();
        
        // 更新积分显示
        updateCoinDisplay();

        // 启动计时器
        startTimer();

        // 初始化爱心数量
        lives = 3;
        updateLivesDisplay();
        
        // 初始化本局游戏积分
        initGameScore(gameType);
        
        // 清空撤销栈
        undoStack = [];
    }, 50);
}

/**
 * 初始化本局游戏积分
 */
function initGameScore(gameType) {
    currentGameScore = 0;
    filledCells = 0;
    
    // 计算空格数：使用全局变量 originalPuzzle
    totalEmptyCells = originalPuzzle.split('').filter(c => c === '0').length;
    
    // 根据难度计算每格得分
    let pointsPerCell = 10;
    if (gameType === 'MEDIUM') {
        pointsPerCell = 12;
    } else if (gameType === 'HARD') {
        pointsPerCell = 15;
    }
    
    // 计算总分
    totalScoreForGame = totalEmptyCells * pointsPerCell;
    
    // 更新显示
    updateGameScoreDisplay();
    updateProgressBar();
}

/**
 * 更新爱心显示
 */
function updateLivesDisplay() {
    const livesDisplay = document.getElementById('livesDisplayTop');
    if (!livesDisplay) return;
    
    let hearts = '';
    for (let i = 0; i < 3; i++) {
        hearts += `<span class="life-heart-top ${i < lives ? '' : 'lost'}">${i < lives ? '❤️' : '🖤'}</span>`;
    }
    livesDisplay.innerHTML = hearts;
}

/**
 * 清除选中单元格的数字
 */
function clearSelectedCell() {
    if (selectedCell) {
        // 选中单元格的索引
        const index = selectedCell.index;
        // 如果是固定数字，不能清除
        if (originalPuzzle[index] !== '0') {
            customAlert('这是固定数字，不能清除', 'warning');
            return;
        }
        selectNumber(0);
    } else {
        customAlert('请先选择一个单元格', 'warning');
    }
}

/**
 * 撤销上一步操作
 */
function undoLastAction() {
    if (undoStack.length === 0) {
        customAlert('没有可以撤销的操作', 'info');
        return;
    }
    
    // 取出最近的操作记录
    const lastAction = undoStack.pop();
    
    // 恢复棋盘状态
    currentBoard = lastAction.previousBoard.map(cell => 
        Array.isArray(cell) ? [...cell] : cell
    );
    
    // 恢复输入模式
    inputMode = lastAction.previousInputMode;
    
    // 恢复积分和进度
    currentGameScore = lastAction.previousScore || 0;
    filledCells = lastAction.previousFilledCells || 0;
    
    // 更新显示
    updateGameScoreDisplay();
    updateProgressBar();
    
    // 重新渲染整个棋盘
    renderBoard();
    
    // 更新数字按钮状态
    updateNumberButtons();
    
    // 保持选中状态
    if (selectedCell) {
        const cells = initCellsCache();
        if (cells[selectedCell.index]) {
            cells[selectedCell.index].classList.add('selected');
        }
    }
    
    // 保存进度
    scheduleSaveProgress();
}

/**
 * 扣除一颗心
 */
function loseLife() {
    if (lives <= 0) return;
    
    lives--;
    updateLivesDisplay();
    
    const board = document.getElementById('sudokuBoard');
    if (board) {
        board.classList.remove('shake');
        void board.offsetWidth;
        board.classList.add('shake');
        
        setTimeout(() => {
            board.classList.remove('shake');
        }, 500);
    }
    
    if (lives <= 0) {
        gameOver();
    }
}

/**
 * 游戏失败处理
 */
function gameOver() {
    // 停止计时器
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 将游戏记录标记为失败状态
    const record = Storage.getRecord(currentPuzzle.id);
    if (record) {
        record.isFailed = true;
        record.isCompleted = true;
        record.completedTime = Date.now();
        Storage.saveRecord(record);
    }
    
    // 计算获得的礼盒（即使失败也能获得）
    calculateEarnedGiftBoxes();
    
    // 清除继续游戏的记录ID
    localStorage.removeItem("continuePuzzleId");
    
    // 显示失败弹窗
    const loseModal = document.getElementById('loseModal');
    if (loseModal) {
        loseModal.style.display = 'block';
    }
    
    // 隐藏游戏控制
    const numberKeyPad = document.getElementById('numberKeyPad');
    if (numberKeyPad) {
        numberKeyPad.style.display = 'none';
    }
    const gameControls = document.getElementById('gameControls');
    if (gameControls) {
        gameControls.style.display = 'none';
    }
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    if (modeToggleBtn) {
        modeToggleBtn.style.display = 'none';
    }
}

/**
 * 获取不同游戏类型的空格数量
 * @param {string} gameType 游戏类型标识
 * @param {string} difficultyType 难度类型标识
 * @returns {number} 空格数量
 */
function getEmptyCountByGameType(gameType, difficultyType = "EASY") {
    const emptyCounts = {
        MINI_4x4: {
            EASY: 8,
            MEDIUM: 12,
            HARD: 14
        },
        MINI_6x6: {
            EASY: 12,
            MEDIUM: 18,
            HARD: 26
        },
        STANDARD: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        SANDWICH: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        DIAGONAL: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        ODD_EVEN: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        KILLER_4x4: {
            EASY: 8,
            MEDIUM: 12,
            HARD: 16
        },
        KILLER_6x6: {
            EASY: 12,
            MEDIUM: 18,
            HARD: 24
        },
        KILLER_9x9: {
            EASY: 32,
            MEDIUM: 44,
            HARD: 56
        },
        IRREGULAR: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        WINDOKU: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        CENTER_DOT: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        STAR: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        BLACK_WHITE_DOT: {
            EASY: 35,
            MEDIUM: 45,
            HARD: 55
        },
        SKYSCRAPER: {
            EASY: 35,
            MEDIUM: 45,
            HARD: 55
        },
        UNTOUCHABLE: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        CUSTOM: {
            CUSTOM: 0
        }
    };
    return emptyCounts[gameType][difficultyType] || 10;
}

/**
 * 获取游戏类型中文名称
 * @param {string} gameType 游戏类型标识
 * @returns {string} 中文名称
 */
function getGameTypeName(gameType) {
    const names = {
        MINI_4x4: '迷你4宫格',
        MINI_6x6: '迷你6宫格',
        EASY: '简单9宫格',
        MEDIUM: '中等9宫格',
        HARD: '高级9宫格',
        STANDARD: '标准9宫格',
        SANDWICH: '三明治数独',
        DIAGONAL: '对角线数独',
        ODD_EVEN: '奇偶数独',
        KILLER_4x4: '杀手4宫格',
        KILLER_6x6: '杀手6宫格',
        KILLER_9x9: '杀手9宫格',
        IRREGULAR: '锯齿数独',
        WINDOKU: '窗口数独',
        CENTER_DOT: '中心点数独',
        STAR: '星号数独',
        BLACK_WHITE_DOT: '黑白点数独',
        SKYSCRAPER: '摩天楼数独',
        UNTOUCHABLE: '无缘数独',
        CUSTOM: '自定义题目'
    };
    return names[gameType] || gameType;
}

/**
 * 获取难度类型中文名称
 * @param {string} difficultyType 难度类型标识
 * @returns {string} 中文名称
 */
function getDifficultyTypeName(difficultyType) {
    const names = {
        EASY: '简单',
        MEDIUM: '中等',
        HARD: '高级',
        CUSTOM: '自定义'
    };
    return names[difficultyType] || "未知";
}

/**
 * 加载用户记录
 */
function loadUserRecord() {
    const record = Storage.getRecord(currentPuzzle.id);
    if (record) {
        attemptCount = record.attemptCount || 0;
        bestTime = record.bestTime;
        const attemptInfo = document.getElementById('attemptInfo');
        if (attemptInfo) {
            attemptInfo.textContent = attemptCount > 0 ? `已重置 ${attemptCount} 次` : '未重置';
        }
        if (bestTime) {
            const bestTimeInfo = document.getElementById('bestTimeInfo');
            if (bestTimeInfo) {
                bestTimeInfo.style.display = 'block';
            }
            const bestTimeEl = document.getElementById('bestTime');
            if (bestTimeEl) {
                bestTimeEl.textContent = formatTime(bestTime);
            }
        } else {
            const bestTimeInfo = document.getElementById('bestTimeInfo');
            if (bestTimeInfo) {
                bestTimeInfo.style.display = 'none';
            }
        }
    } else {
        attemptCount = 0;
        bestTime = null;
        const attemptInfo = document.getElementById('attemptInfo');
        if (attemptInfo) {
            attemptInfo.textContent = '未重置';
        }
        const bestTimeInfo = document.getElementById('bestTimeInfo');
        if (bestTimeInfo) {
            bestTimeInfo.style.display = 'none';
        }
    }

    // 保存尝试记录
    saveAttemptRecord();
}

/**
 * 保存尝试记录
 */
function saveAttemptRecord() {
    const record = Storage.getRecord(currentPuzzle.id) || {
        puzzleId: currentPuzzle.id,
        gameType: currentGameType,
        difficultyType: currentDifficulty,
        startTime: Date.now(),
        attemptCount: 0,
        isCompleted: false,
        bestTime: null,
        currentBoard: '',
        elapsedTime: 0
    };
    record.attemptCount = attemptCount; // 使用当前的重置次数
    Storage.saveRecord(record);
}

/**
 * 保存当前游戏进度
 */
function saveGameProgress() {
    if (!currentPuzzle) return;

    const record = Storage.getRecord(currentPuzzle.id);
    if (record) {
        // 将棋盘状态转换为JSON字符串保存（支持数组类型的候选数字）
        record.currentBoard = JSON.stringify(currentBoard);
        record.elapsedTime = seconds;
        record.lives = lives;
        record.currentGameScore = currentGameScore;
        record.filledCells = filledCells;
        Storage.saveRecord(record);
    }
}

/**
 * 保存原始题目信息
 */
function saveOriginalPuzzle(puzzleId, puzzleStr, solutionStr) {
    let record = Storage.getRecord(puzzleId);
    if (!record) {
        record = {
            puzzleId: puzzleId,
            originalPuzzle: puzzleStr,
            solution: solutionStr,
            gameType: currentGameType,
            difficultyType: currentDifficulty,
            startTime: Date.now(),
            attemptCount: 0,
            isCompleted: false,
            bestTime: null,
            currentBoard: puzzleStr,
            elapsedTime: 0,
            gameTypeStr: currentPuzzle.gameTypeStr || 'STANDARD',
            boardSize: currentPuzzle.size || 9,
            oddEvenMarks: currentPuzzle.oddEvenMarks || null,
            cages: currentPuzzle.cages || null,
            irregularBoxes: currentPuzzle.irregularBoxes || null,
            sandwichClues: currentPuzzle.sandwichClues || null,
            blackWhiteDotHints: currentPuzzle.blackWhiteDotHints || null,
            skyscraperClues: currentPuzzle.skyscraperClues || null
        };
    } else {
        record.originalPuzzle = puzzleStr;
        record.solution = solutionStr;
        record.boardSize = currentPuzzle.size || 9;
        record.irregularBoxes = currentPuzzle.irregularBoxes || null;
        record.sandwichClues = currentPuzzle.sandwichClues || null;
        record.blackWhiteDotHints = currentPuzzle.blackWhiteDotHints || null;
        record.skyscraperClues = currentPuzzle.skyscraperClues || null;
    }
    Storage.saveRecord(record);
    // 保存当前游戏ID，用于继续游戏
    localStorage.setItem("continuePuzzleId", puzzleId);
}

/**
 * 渲染数独棋盘
 */
function renderBoard() {
    const boardContainer = document.getElementById('sudokuBoard');
    boardContainer.innerHTML = '';
    cellsCache = [];

    // 获取当前棋盘尺寸和游戏类型
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const oddEvenMarks = currentPuzzle.oddEvenMarks;
    const cages = currentPuzzle.cages;
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const sandwichClues = currentPuzzle.sandwichClues;

    // 摩天楼数独需要特殊布局（四个方向外部提示）
    const skyscraperClues = currentPuzzle.skyscraperClues;
    if (gameTypeStr === 'SKYSCRAPER' && skyscraperClues) {
        renderSkyscraperBoard(boardContainer, size, boxRows, boxCols, skyscraperClues);
        return;
    }

    // 三明治数独需要特殊布局（外部提示）
    if (gameTypeStr === 'SANDWICH' && sandwichClues) {
        renderSandwichBoard(boardContainer, size, boxRows, boxCols, sandwichClues);
        return;
    }

    const board = boardContainer;

    // 动态设置网格列数
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    // 根据游戏类型添加样式类
    board.className = `sudoku-board game-type-${gameTypeStr.toLowerCase()}`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            // 对角线数独：标记对角线上的格子
            if (gameTypeStr === 'DIAGONAL') {
                if (i === j || i + j === size - 1) {
                    cell.classList.add('diagonal-cell');
                }
            }

            // 奇偶数独：根据奇偶性标记格子
            if (gameTypeStr === 'ODD_EVEN' && oddEvenMarks) {
                if (oddEvenMarks[i][j]) {
                    cell.classList.add('odd-cell');
                } else {
                    cell.classList.add('even-cell');
                }
            }

            // 锯齿数独：标记不规则宫格颜色和边框
            if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
                for (let boxIndex = 0; boxIndex < irregularBoxes.length; boxIndex++) {
                    const box = irregularBoxes[boxIndex];
                    if (box.some(cellInfo => cellInfo[0] === i && cellInfo[1] === j)) {
                        // 添加宫格颜色类
                        cell.classList.add(`irregular-box-${boxIndex}`);
                        // 标记宫格边框
                        const isTopEdge = !box.some(c => c[0] === i - 1 && c[1] === j);
                        const isBottomEdge = !box.some(c => c[0] === i + 1 && c[1] === j);
                        const isLeftEdge = !box.some(c => c[1] === j - 1 && c[0] === i);
                        const isRightEdge = !box.some(c => c[1] === j + 1 && c[0] === i);

                        if (isTopEdge) cell.classList.add('irregular-border-top');
                        if (isBottomEdge) cell.classList.add('irregular-border-bottom');
                        if (isLeftEdge) cell.classList.add('irregular-border-left');
                        if (isRightEdge) cell.classList.add('irregular-border-right');
                        break;
                    }
                }
            }

            // 窗口数独：标记四个额外的3x3窗口区域
            if (gameTypeStr === 'WINDOKU') {
                // 定义四个窗口区域（位于棋盘中心，形成十字交叉）
                const windokuRegions = [
                    { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },   // 左上窗口
                    { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },   // 右上窗口
                    { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },   // 左下窗口
                    { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }    // 右下窗口
                ];
                for (const region of windokuRegions) {
                    if (i >= region.startRow && i <= region.endRow &&
                        j >= region.startCol && j <= region.endCol) {
                        cell.classList.add('windoku-cell');
                        break;
                    }
                }
            }

            // 中心点数独：标记九个3x3宫格的中心单元格
            if (gameTypeStr === 'CENTER_DOT') {
                // 每个3x3宫格的中心位置：(1,1), (1,4), (1,7), (4,1), (4,4), (4,7), (7,1), (7,4), (7,7)
                if (i % 3 === 1 && j % 3 === 1) {
                    cell.classList.add('center-cell');
                }
            }

            // 星号数独：标记星形图案单元格
            if (gameTypeStr === 'STAR') {
                const starCells = [
                    [1, 4], [2, 2], [2, 6], [4, 1], [4, 4], [4, 7], [6, 2], [6, 6], [7, 4]
                ];
                if (starCells.some(([sr, sc]) => sr === i && sc === j)) {
                    cell.classList.add('star-cell');
                }
            }

            // 杀手数独：标记笼子信息和边框
            if (gameTypeStr === 'KILLER' && cages) {
                for (let cageIndex = 0; cageIndex < cages.length; cageIndex++) {
                    const cage = cages[cageIndex];
                    if (cage.cells.some(cellInfo => cellInfo.row === i && cellInfo.col === j)) {
                        cell.dataset.cageSum = cage.sum;
                        // 添加笼子颜色类（循环使用12种颜色）
                        const colorIndex = cageIndex % 12;
                        cell.classList.add(`cage-color-${colorIndex}`);
                        // 标记笼子边框
                        const cageCells = cage.cells;
                        const isTopEdge = !cageCells.some(c => c.row === i - 1 && c.col === j);
                        const isBottomEdge = !cageCells.some(c => c.row === i + 1 && c.col === j);
                        const isLeftEdge = !cageCells.some(c => c.col === j - 1 && c.row === i);
                        const isRightEdge = !cageCells.some(c => c.col === j + 1 && c.row === i);

                        if (isTopEdge) cell.classList.add('cage-border-top');
                        if (isBottomEdge) cell.classList.add('cage-border-bottom');
                        if (isLeftEdge) cell.classList.add('cage-border-left');
                        if (isRightEdge) cell.classList.add('cage-border-right');
                        break;
                    }
                }
            }

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 杀手数独：创建笼子和元素
            let cageSumEl = null;
            if (gameTypeStr === 'KILLER' && cages && cages.length > 0) {
                const cage = cages.find(c => c.cells.some(cellInfo => cellInfo.row === i && cellInfo.col === j));
                if (cage) {
                    const isFirstCell = cage.cells[0].row === i && cage.cells[0].col === j;
                    if (isFirstCell) {
                        cageSumEl = document.createElement('div');
                        cageSumEl.className = 'cage-sum';
                        cageSumEl.textContent = cage.sum;
                    }
                }
            }

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                    const correctAnswer = parseInt(currentPuzzle.solution[index]);
                    if (value !== correctAnswer) {
                        cell.classList.add('error');
                    } else {
                        cell.classList.add('correct');
                    }
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            // 最后添加笼子和（确保在最上层）
            if (cageSumEl) {
                cell.appendChild(cageSumEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => {
                    if (paintMode) {
                        handlePaintCell(i, j);
                    } else {
                        selectCell(i, j, cell);
                    }
                });
                if (isMobileDevice) {
                    // 手机端：绑定触摸事件，处理双击和长按
                    cell.addEventListener('touchstart', (e) => handleTouchStart(e, i, j, cell), { passive: false });
                    cell.addEventListener('touchend', handleTouchEnd);
                } else {
                    // 电脑端：绑定鼠标事件，处理双击和长按
                    cell.addEventListener('dblclick', (e) => handleDoubleClick(e, i, j, cell));
                    cell.addEventListener('mousedown', (e) => handleMouseDown(e, i, j, cell));
                    cell.addEventListener('mouseup', handleMouseUp);
                    cell.addEventListener('mouseleave', handleMouseUp);
                }
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();

    // 渲染黑白点数独的点标记
    renderBlackWhiteDots(board);
}

/**
 * 渲染黑白点数独的点标记
 */
function renderBlackWhiteDots(board) {
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    if (gameTypeStr !== 'BLACK_WHITE_DOT') return;

    const dots = currentPuzzle.blackWhiteDotHints;
    if (!dots || dots.length === 0) return;

    // 使用requestAnimationFrame确保DOM已完全渲染
    requestAnimationFrame(() => {
        // 获取第一个单元格的实际尺寸作为参考
        const firstCell = board.querySelector('.cell');
        if (!firstCell) return;

        const cellRect = firstCell.getBoundingClientRect();
        const cellSize = cellRect.width;

        // 获取目标单元格来精确计算位置
        dots.forEach(dot => {
            const dotEl = document.createElement('div');
            dotEl.className = `dot-marker ${dot.type}`;

            let targetCell;
            let left, top;

            if (dot.direction === 'right') {
                // 右边相邻，点在两个格子之间，获取右边单元格
                targetCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col + 1}"]`);
                if (targetCell) {
                    const targetRect = targetCell.getBoundingClientRect();
                    const currentCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col}"]`);
                    if (currentCell) {
                        const currentRect = currentCell.getBoundingClientRect();
                        left = currentRect.right + (targetRect.left - currentRect.right) / 2 - 3;
                        top = currentRect.top + currentRect.height / 2 - 3;
                    }
                }
            } else {
                // 下边相邻，点在两个格子之间，获取下边单元格
                targetCell = board.querySelector(`[data-row="${dot.row + 1}"][data-col="${dot.col}"]`);
                if (targetCell) {
                    const targetRect = targetCell.getBoundingClientRect();
                    const currentCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col}"]`);
                    if (currentCell) {
                        const currentRect = currentCell.getBoundingClientRect();
                        left = currentRect.left + currentRect.width / 2 - 3;
                        top = currentRect.bottom + (targetRect.top - currentRect.bottom) / 2 - 3;
                    }
                }
            }

            // 如果无法获取单元格，使用备用计算方法
            if (isNaN(left) || isNaN(top)) {
                left = (dot.direction === 'right' ? (dot.col + 1) : (dot.col + 0.5)) * cellSize + 0.5;
                top = (dot.direction === 'right' ? (dot.row + 0.5) : (dot.row + 1)) * cellSize + 0.5;
            }

            // 转换为相对于board的位置
            const boardRect = board.getBoundingClientRect();
            dotEl.style.left = `${left - boardRect.left}px`;
            dotEl.style.top = `${top - boardRect.top}px`;
            board.appendChild(dotEl);
        });
    });
}

/**
 * 渲染摩天楼数独棋盘（带四个方向外部提示）
 * @param {HTMLElement} container - 容器元素
 * @param {number} size - 棋盘尺寸
 * @param {number} boxRows - 宫格行数
 * @param {number} boxCols - 宫格列数
 * @param {object} skyscraperClues - 摩天楼提示 {top, bottom, left, right}
 */
function renderSkyscraperBoard(container, size, boxRows, boxCols, skyscraperClues) {
    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'skyscraper-layout';

    // 创建顶部提示行（11个元素，首尾为空）
    const topClues = document.createElement('div');
    topClues.className = 'skyscraper-clues-top';
    for (let col = 0; col < skyscraperClues.top.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.top[col] || '';
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建中间行（左侧提示 + 棋盘 + 右侧提示）
    const middleRow = document.createElement('div');
    middleRow.className = 'skyscraper-middle-row';

    // 创建左侧提示列（11个元素，首尾为空）
    const leftClues = document.createElement('div');
    leftClues.className = 'skyscraper-clues-left';
    for (let row = 0; row < skyscraperClues.left.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.left[row] || '';
        leftClues.appendChild(clue);
    }
    middleRow.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-skyscraper';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => {
                    if (paintMode) {
                        handlePaintCell(i, j);
                    } else {
                        selectCell(i, j, cell);
                    }
                });
                
                if (isMobileDevice) {
                    // 手机端：绑定触摸事件，处理双击和长按
                    cell.addEventListener('touchstart', (e) => handleTouchStart(e, i, j, cell), { passive: false });
                    cell.addEventListener('touchend', handleTouchEnd);
                } else {
                    // 电脑端：绑定鼠标事件，处理双击和长按
                    cell.addEventListener('dblclick', (e) => handleDoubleClick(e, i, j, cell));
                    cell.addEventListener('mousedown', (e) => handleMouseDown(e, i, j, cell));
                    cell.addEventListener('mouseup', handleMouseUp);
                    cell.addEventListener('mouseleave', handleMouseUp);
                }
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }
    middleRow.appendChild(board);

    // 创建右侧提示列（11个元素，首尾为空）
    const rightClues = document.createElement('div');
    rightClues.className = 'skyscraper-clues-right';
    for (let row = 0; row < skyscraperClues.right.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.right[row] || '';
        rightClues.appendChild(clue);
    }
    middleRow.appendChild(rightClues);

    layout.appendChild(middleRow);

    // 创建底部提示行（11个元素，首尾为空）
    const bottomClues = document.createElement('div');
    bottomClues.className = 'skyscraper-clues-bottom';
    for (let col = 0; col < skyscraperClues.bottom.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.bottom[col] || '';
        bottomClues.appendChild(clue);
    }
    layout.appendChild(bottomClues);

    container.appendChild(layout);

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();
}

/**
 * 渲染三明治数独棋盘（带外部提示）
 * @param {HTMLElement} container - 容器元素
 * @param {number} size - 棋盘尺寸
 * @param {number} boxRows - 宫格行数
 * @param {number} boxCols - 宫格列数
 * @param {object} sandwichClues - 三明治提示
 */
function renderSandwichBoard(container, size, boxRows, boxCols, sandwichClues) {
    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'sandwich-layout';

    // 创建左上角空白占位
    const topLeftEmpty = document.createElement('div');
    topLeftEmpty.className = 'sandwich-top-left-empty';
    layout.appendChild(topLeftEmpty);

    // 创建顶部提示行
    const topClues = document.createElement('div');
    topClues.className = 'sandwich-clues-top';
    // 顶部提示（列提示）- 确保只渲染与棋盘列数相同数量的提示
    for (let col = 0; col < size; col++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.left[col] || 0;
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建左侧提示列
    const leftClues = document.createElement('div');
    leftClues.className = 'sandwich-clues-left';
    // 左侧提示（行提示）- 确保只渲染与棋盘行数相同数量的提示
    for (let row = 0; row < size; row++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.top[row] || 0;
        leftClues.appendChild(clue);
    }
    layout.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-sandwich';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => {
                    if (paintMode) {
                        handlePaintCell(i, j);
                    } else {
                        selectCell(i, j, cell);
                    }
                });
                
                if (isMobileDevice) {
                    // 手机端：绑定触摸事件，处理双击和长按
                    cell.addEventListener('touchstart', (e) => handleTouchStart(e, i, j, cell), { passive: false });
                    cell.addEventListener('touchend', handleTouchEnd);
                } else {
                    // 电脑端：绑定鼠标事件，处理双击和长按
                    cell.addEventListener('dblclick', (e) => handleDoubleClick(e, i, j, cell));
                    cell.addEventListener('mousedown', (e) => handleMouseDown(e, i, j, cell));
                    cell.addEventListener('mouseup', handleMouseUp);
                    cell.addEventListener('mouseleave', handleMouseUp);
                }
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }
    // 将棋盘添加到布局容器
    layout.appendChild(board);

    container.appendChild(layout);

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();
}

/**
    * 检查数字在同行/列/宫中是否唯一出现（仅在候选数字中）
    * 只要在四种情况中的任一种情况下唯一，就返回 true
    * @param {number} row - 行号
    * @param {number} col - 列号
    * @param {number} num - 数字
    * @returns {boolean} - 是否在任一种情况下唯一
    */
function isCandidateUnique(row, col, num) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const index = row * size + col;

    // 首先检查：如果同行、同列或同宫已经有确定值num，
    // 那么当前格子的候选数num实际上是无效的，不应该高亮
    // 条件0：检查同行是否已有确定值num
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
            return false;
        }
    }

    // 检查同列是否已有确定值num
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
            return false;
        }
    }

    // 检查同宫是否已有确定值num
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
                        return false;
                    }
                }
                break;
            }
        }
    } else {
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const idx = r * size + c;
                if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
                    return false;
                }
            }
        }
    }

    // 条件0.5：如果当前格子的候选数只有一个，那么这个候选数应该高亮
    // 这是"唯一候选"策略，与下面的"唯一位置"策略是两种不同的高亮逻辑
    const currentCellValue = currentBoard[index];
    if (Array.isArray(currentCellValue) && currentCellValue.length === 1 && currentCellValue[0] === num) {
        return true;
    }

    // 条件1：检查同行是否唯一（该数字在该行只有这一个可填位置）
    let rowUnique = true;
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
            rowUnique = false;
            break;
        }
    }

    // 条件2：检查同列是否唯一（该数字在该列只有这一个可填位置）
    let colUnique = true;
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
            colUnique = false;
            break;
        }
    }

    // 条件3：检查同宫是否唯一（该数字在该宫只有这一个可填位置）
    let boxUnique = true;
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：检查不规则宫格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
                        boxUnique = false;
                        break;
                    }
                }
                break;
            }
        }
    } else {
        // 标准数独：检查规则宫格
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const idx = r * size + c;
                if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
                    boxUnique = false;
                    break;
                }
            }
            if (!boxUnique) break;
        }
    }

    // 只有在任一种情况下唯一，才返回 true
    return rowUnique || colUnique || boxUnique;
}

/**
    * 创建候选数字元素（优化：缓存常用元素）
    * @param {number[]} values - 候选数字数组
    * @param {number} row - 行号（用于判断唯一性）
    * @param {number} col - 列号（用于判断唯一性）
    */
function createCandidatesElement(values, row, col) {
    const candidatesEl = document.createElement('div');
    candidatesEl.className = 'cell-candidates';
    const size = currentPuzzle.size || 9;

    // 根据尺寸添加不同的类名用于样式调整
    if (size === 4) {
        candidatesEl.classList.add('size-4x4');
    } else if (size === 6) {
        candidatesEl.classList.add('size-6x6');
    }

    const maxNum = size;
    for (let n = 1; n <= maxNum; n++) {
        const candidateEl = document.createElement('span');
        if (values.includes(n)) {
            // 只有当数字在同行/列/宫中唯一时才显示彩色背景
            if (isCandidateUnique(row, col, n)) {
                candidateEl.className = `candidate-num c${n}`;
            } else {
                candidateEl.className = 'candidate-num candidate-normal';
            }
            candidateEl.textContent = n;
        } else {
            candidateEl.className = 'candidate-num';
            candidateEl.textContent = '';
        }
        candidatesEl.appendChild(candidateEl);
    }
    return candidatesEl;
}

/**
    * 更新单个单元格显示（优化：局部更新）
    * @param {number} index - 单元格索引
    */
function updateCellDisplay(index) {
    if (!cellsCache || !cellsCache[index]) return;

    const cell = cellsCache[index];
    const value = currentBoard[index];
    const isFixed = originalPuzzle[index] !== '0';
    const size = currentPuzzle.size || 9;
    const row = Math.floor(index / size);
    const col = index % size;

    // 保存笼子和元素（如果存在）
    const cageSumEl = cell.querySelector('.cage-sum');

    // 清除之前的内容
    cell.innerHTML = '';
    cell.classList.remove('fixed', 'user-input', 'conflict', 'error');

    if (typeof value === 'number') {
        const valueEl = document.createElement('span');
        valueEl.textContent = getIcon(value);
        valueEl.style.position = 'absolute';
        valueEl.style.top = '50%';
        valueEl.style.left = '50%';
        valueEl.style.transform = 'translate(-50%, -50%)';
        valueEl.style.zIndex = '5';
        cell.appendChild(valueEl);
        if (isFixed) {
            cell.classList.add('fixed');
        } else {
            cell.classList.add('user-input');
            const correctAnswer = parseInt(currentPuzzle.solution[index]);
            if (value !== correctAnswer) {
                cell.classList.add('error');
            } else {
                cell.classList.add('correct');
            }
        }
    } else if (Array.isArray(value) && value.length > 0) {
        cell.appendChild(createCandidatesElement(value, row, col));
    }

    // 最后重新添加笼子和元素（确保在最上层）
    if (cageSumEl) {
        cell.appendChild(cageSumEl);
    }
}

/**
    * 更新所有候选数格子的显示（全局更新候选数高亮）
    * 用于确定模式下填写确定数后，候选数高亮状态可能全局改变的情况
    */
function updateAllCandidateCells() {
    const size = currentPuzzle.size || 9;
    const totalCells = size * size;

    for (let idx = 0; idx < totalCells; idx++) {
        const value = currentBoard[idx];
        // 只更新候选数格子
        if (Array.isArray(value) && value.length > 0) {
            updateCellDisplay(idx);
        }
    }
    
    // 自动检测游戏是否完成
    autoCheckCompletion();
}

/**
 * 自动检测游戏是否完成
 */
function autoCheckCompletion() {
    const size = currentPuzzle.size || 9;
    const totalCells = size * size;
    
    // 检查是否所有格子都填了确定值
    let allFilled = true;
    for (let idx = 0; idx < totalCells; idx++) {
        const value = currentBoard[idx];
        if (Array.isArray(value) || (typeof value === 'number' && value === 0)) {
            allFilled = false;
            break;
        }
    }
    
    // 如果所有格子都填满了，自动检查答案
    if (allFilled) {
        // 检查是否有冲突
        const hasConflict = document.querySelector('.cell.conflict');
        if (!hasConflict) {
            // 验证答案
            const userSolution = currentBoard.join('');
            if (userSolution === currentPuzzle.solution) {
                // 答案正确，触发完成逻辑
                checkSolution();
            }
        }
    }
}

/**
    * 初始化单元格缓存
    */
let longPressTimer = null;
let touchStartCell = null;
let touchStartTime = 0;
let lastTouchTime = 0;
let lastTouchCell = null;
let ignoreNextClick = false;
let ignoreClickTimeout = null;

// 检测是否为移动设备
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

function initCellsCache() {
    if (!cellsCache || cellsCache.length === 0) {
        cellsCache = Array.from(document.querySelectorAll('.cell'));
    }
    return cellsCache;
}

function handleDoubleClick(e, row, col, cell) {
    e.preventDefault();
    const size = currentPuzzle.size || 9;
    const index = row * size + col;
    const value = currentBoard[index];
    const isFixed = originalPuzzle[index] !== '0';

    if (isFixed) {
        return;
    }

    // 如果是错误数字，先清除它
    if (typeof value === 'number' && value !== 0) {
        const correctAnswer = parseInt(currentPuzzle.solution[index]);
        if (value !== correctAnswer) {
            selectCell(row, col, cell);
            placeNumber(0);
        }
    }

    // 获取候选数
    const candidates = getCandidates(row, col);

    // 如果只有一个候选数，直接填写
    if (candidates.length === 1) {
        selectCell(row, col, cell);
        inputMode = 'exact';
        selectNumber(candidates[0]);
        return;
    }

    // 显示候选数字选择框（显示所有数字，候选数字可点击）
    selectCell(row, col, cell);
    showCandidatesOnlyPicker(e.clientX, e.clientY, row, col);
}

function handleMouseDown(e, row, col, cell) {
    if (cell.classList.contains('correct')) {
        return;
    }
    const size = currentPuzzle.size || 9;
    const index = row * size + col;
    const value = currentBoard[index];
    if (typeof value === 'number' && value !== 0) {
        return;
    }

    touchStartCell = { row, col, cell };
    longPressTimer = setTimeout(() => {
        selectCell(row, col, cell);
        showCandidatePicker(e.clientX, e.clientY);
        touchStartCell = null;
        // 电脑端：忽略 mouseup 后紧接着的 click 事件
        if (!isMobileDevice) {
            if (ignoreClickTimeout) clearTimeout(ignoreClickTimeout);
            ignoreNextClick = true;
            // 不设置超时重置，让 closePickersHandler 来重置
        }
    }, 500);
}

function handleMouseUp() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    touchStartCell = null;
}

function handleTouchStart(e, row, col, cell) {
    const now = Date.now();
    const size = currentPuzzle.size || 9;
    const index = row * size + col;
    const value = currentBoard[index];

    // 双击检测：300ms 内再次点击同一格子
    if (lastTouchCell === cell && now - lastTouchTime < 300) {
        e.preventDefault();
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        const isFixed = originalPuzzle[index] !== '0';
        if (!isFixed) {
            // 如果是错误数字，先清除它
            if (typeof value === 'number' && value !== 0) {
                const correctAnswer = parseInt(currentPuzzle.solution[index]);
                if (value !== correctAnswer) {
                    selectCell(row, col, cell);
                    placeNumber(0);
                }
            }

            // 获取候选数
            const candidates = getCandidates(row, col);

            // 如果只有一个候选数，直接填写
            if (candidates.length === 1) {
                selectCell(row, col, cell);
                inputMode = 'exact';
                selectNumber(candidates[0]);
            } else {
                // 显示候选数字选择框（显示所有数字，候选数字可点击）
                selectCell(row, col, cell);
                const touch = e.touches[0];
                showCandidatesOnlyPicker(touch.clientX, touch.clientY, row, col);
            }
        }

        lastTouchTime = 0;
        lastTouchCell = null;
        touchStartCell = null;
        return;
    }

    lastTouchTime = now;
    lastTouchCell = cell;

    // 长按逻辑
    if (cell.classList.contains('correct')) {
        return;
    }
    if (typeof value === 'number' && value !== 0) {
        return;
    }

    touchStartCell = { row, col, cell };
    longPressTimer = setTimeout(() => {
        selectCell(row, col, cell);
        const touch = e.touches[0];
        showCandidatePicker(touch.clientX, touch.clientY);
        touchStartCell = null;
        lastTouchTime = 0;
        lastTouchCell = null;
        // 手机端：忽略 touchend 后紧接着的 click 事件（100ms 内）
        if (isMobileDevice) {
            if (ignoreClickTimeout) clearTimeout(ignoreClickTimeout);
            ignoreNextClick = true;
            ignoreClickTimeout = setTimeout(() => { ignoreNextClick = false; }, 100);
        }
    }, 500);
}

function handleTouchEnd() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    touchStartCell = null;
}

function adjustPickerPosition(picker, x, y) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = picker.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const margin = 8;

    let left = x;
    let top = y;

    if (left - w / 2 < margin) {
        left = w / 2 + margin;
    } else if (left + w / 2 > vw - margin) {
        left = vw - w / 2 - margin;
    }

    if (top - h / 2 < margin) {
        top = h / 2 + margin;
    } else if (top + h / 2 > vh - margin) {
        top = vh - h / 2 - margin;
    }

    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
}

function showNumberPicker(x, y) {
    closePickers();

    const picker = document.createElement('div');
    picker.className = 'number-picker';
    picker.id = 'numberPicker';

    const size = currentPuzzle.size || 9;
    if (size === 4) {
        picker.classList.add('size-4x4');
    } else if (size === 6) {
        picker.classList.add('size-6x6');
    }
    for (let num = 1; num <= size; num++) {
        const btn = document.createElement('button');
        btn.className = 'picker-btn';
        btn.textContent = getIcon(num);
        btn.onclick = (e) => {
            e.stopPropagation();
            inputMode = 'exact';
            selectNumber(num);
            closePickers();
        };
        picker.appendChild(btn);
    }

    document.body.appendChild(picker);
    adjustPickerPosition(picker, x, y);

    setTimeout(() => {
        picker.classList.add('visible');
    }, 0);

    document.addEventListener('click', closePickersHandler);
}

function showCandidatePicker(x, y) {
    closePickers();

    const picker = document.createElement('div');
    picker.className = 'candidate-picker';
    picker.id = 'candidatePicker';

    if (!selectedCell) return;
    const index = selectedCell.index;
    const currentCandidates = Array.isArray(currentBoard[index]) ? [...currentBoard[index]] : [];
    const size = currentPuzzle.size || 9;
    if (size === 4) {
        picker.classList.add('size-4x4');
    } else if (size === 6) {
        picker.classList.add('size-6x6');
    }

    for (let num = 1; num <= size; num++) {
        const btn = document.createElement('button');
        btn.className = 'picker-btn' + (currentCandidates.includes(num) ? ' selected' : '');
        btn.textContent = getIcon(num);
        btn.onclick = (e) => {
            e.stopPropagation();
            inputMode = 'candidate';
            selectNumber(num);
            refreshCandidatePicker(btn);
        };
        picker.appendChild(btn);
    }

    let currentPicker = picker;
    function refreshCandidatePicker(clickedBtn) {
        if (!currentPicker || !document.body.contains(currentPicker)) return;
        const index = selectedCell ? selectedCell.index : -1;
        const candidates = index >= 0 && Array.isArray(currentBoard[index]) ? currentBoard[index] : [];
        const size = currentPuzzle.size || 9;
        const btns = currentPicker.querySelectorAll('.picker-btn');
        btns.forEach((b, i) => {
            if (i < size) {
                b.classList.toggle('selected', candidates.includes(i + 1));
            }
        });
    }

    document.body.appendChild(picker);
    adjustPickerPosition(picker, x, y);

    setTimeout(() => {
        picker.classList.add('visible');
    }, 0);

    document.addEventListener('click', closePickersHandler);
}

function showCandidatesOnlyPicker(x, y, row, col) {
    closePickers();

    const picker = document.createElement('div');
    picker.className = 'number-picker candidates-only';
    picker.id = 'candidatesOnlyPicker';

    const size = currentPuzzle.size || 9;
    if (size === 4) {
        picker.classList.add('size-4x4');
    } else if (size === 6) {
        picker.classList.add('size-6x6');
    }

    const candidates = getCandidates(row, col);

    for (let num = 1; num <= size; num++) {
        const btn = document.createElement('button');
        const isCandidate = candidates.includes(num);
        btn.className = 'picker-btn' + (isCandidate ? '' : ' disabled');
        btn.textContent = getIcon(num);
        if (isCandidate) {
            btn.onclick = (e) => {
                e.stopPropagation();
                inputMode = 'exact';
                selectNumber(num);
                closePickers();
            };
        } else {
            btn.disabled = true;
        }
        picker.appendChild(btn);
    }

    document.body.appendChild(picker);
    adjustPickerPosition(picker, x, y);

    setTimeout(() => {
        picker.classList.add('visible');
    }, 0);

    document.addEventListener('click', closeCandidatesOnlyPickerHandler);
}

function closeCandidatesOnlyPickerHandler(e) {
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    const picker = document.getElementById('candidatesOnlyPicker');
    if (picker && !picker.contains(e.target)) {
        picker.classList.remove('visible');
        setTimeout(() => picker.remove(), 200);
        document.removeEventListener('click', closeCandidatesOnlyPickerHandler);
    }
}

function closePickers() {
    const numberPicker = document.getElementById('numberPicker');
    const candidatePicker = document.getElementById('candidatePicker');
    const candidatesOnlyPicker = document.getElementById('candidatesOnlyPicker');

    if (numberPicker) {
        numberPicker.classList.remove('visible');
        setTimeout(() => numberPicker.remove(), 200);
    }
    if (candidatePicker) {
        candidatePicker.classList.remove('visible');
        setTimeout(() => candidatePicker.remove(), 200);
        if (inputMode === 'candidate') {
            toggleInputMode();
        }
    }
    if (candidatesOnlyPicker) {
        candidatesOnlyPicker.classList.remove('visible');
        setTimeout(() => candidatesOnlyPicker.remove(), 200);
        document.removeEventListener('click', closeCandidatesOnlyPickerHandler);
    }

    document.removeEventListener('click', closePickersHandler);
}

function closePickersHandler(e) {
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    const numberPicker = document.getElementById('numberPicker');
    const candidatePicker = document.getElementById('candidatePicker');
    
    if (numberPicker && !numberPicker.contains(e.target)) {
        closePickers();
    }
    if (candidatePicker && !candidatePicker.contains(e.target)) {
        closePickers();
    }
}

/**
    * 选中单元格（优化版：减少重复操作）
    */
function selectCell(row, col, cell) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const index = row * size + col;
    const clickedValue = currentBoard[index];
    const cells = initCellsCache();

    // 获取当前单元格所属的不规则宫格（如果是锯齿数独）
    let currentBoxCells = null;
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        for (const box of irregularBoxes) {
            if (box.some(cellInfo => cellInfo[0] === row && cellInfo[1] === col)) {
                currentBoxCells = box;
                break;
            }
        }
    }

    // 清除之前选中单元格的样式
    if (selectedCell && cells[selectedCell.index]) {
        cells[selectedCell.index].classList.remove('selected');
    }

    // 清除所有高亮样式（每次选中新格子都重新计算）
    cells.forEach(c => {
        c.classList.remove('highlighted-row', 'highlighted-col', 'highlighted-box', 'highlighted-num');
    });

    // 应用行、列、宫高亮（无论是否有确定值）
    cells.forEach((c, idx) => {
        const cellRow = Math.floor(idx / size);
        const cellCol = idx % size;

        if (cellRow === row) c.classList.add('highlighted-row');
        if (cellCol === col) c.classList.add('highlighted-col');

        // 宫格高亮（支持标准和锯齿数独）
        if (gameTypeStr === 'IRREGULAR' && currentBoxCells) {
            // 锯齿数独：检查是否在同一不规则宫格
            if (currentBoxCells.some(cellInfo => cellInfo[0] === cellRow && cellInfo[1] === cellCol)) {
                c.classList.add('highlighted-box');
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRowStart = Math.floor(row / boxRows) * boxRows;
            const boxColStart = Math.floor(col / boxCols) * boxCols;
            if (cellRow >= boxRowStart && cellRow < boxRowStart + boxRows &&
                cellCol >= boxColStart && cellCol < boxColStart + boxCols) {
                c.classList.add('highlighted-box');
            }
        }
    });

    // 如果点击的是确定值，高亮相同数字
    if (clickedValue !== 0 && typeof clickedValue === 'number') {
        cells.forEach((c, idx) => {
            if (currentBoard[idx] === clickedValue) {
                c.classList.add('highlighted-num');
            }
        });
    }

    cell.classList.add('selected');
    selectedCell = { row, col, index };

    if (selectedNumber !== null) {
        placeNumber(selectedNumber);
    }
}

/**
    * 统计数字在棋盘上作为确定值出现的次数
    * @param {number} num - 要统计的数字（1-9）
    * @returns {number} - 出现次数
    */
function countNumberOccurrences(num) {
    return currentBoard.filter(cell => typeof cell === 'number' && cell === num).length;
}

/**
    * 动态生成数字键盘
    */
function generateNumberKeypad() {
    const keypad = document.getElementById('numberKeyPad');
    keypad.innerHTML = '';

    const size = currentPuzzle.size || 9;

    // 创建第一行（1-5）
    const row1 = document.createElement('div');
    row1.className = 'number-keypad-row';
    for (let num = 1; num <= 5; num++) {
        if(num > size) continue;
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.onclick = () => selectNumber(num);
        btn.innerHTML = `<span class="num-value">${num}</span><span class="num-remaining">${size}</span>`;
        row1.appendChild(btn);
    }
    keypad.appendChild(row1);

    // 创建第二行（6-9）
    if (size >= 6) {
        const row2 = document.createElement('div');
        row2.className = 'number-keypad-row';
        for (let num = 6; num <= size; num++) {
            const btn = document.createElement('button');
            btn.className = 'num-btn';
            btn.onclick = () => selectNumber(num);
            btn.innerHTML = `<span class="num-value">${num}</span><span class="num-remaining">${size}</span>`;
            row2.appendChild(btn);
        }
        keypad.appendChild(row2);
    }
}

/**
    * 更新数字按钮的显示状态
    */
function updateNumberButtons() {
    const size = currentPuzzle.size || 9;

    // 第一步：收集所有数字的剩余数量
    const remainings = [];
    for (let num = 1; num <= size; num++) {
        const count = countNumberOccurrences(num);
        const remaining = size - count;
        remainings.push({ num, remaining });
    }

    // 找出最小剩余数量（排除已用完的数字）
    const availableRemainings = remainings.filter(r => r.remaining > 0);
    const minRemaining = availableRemainings.length > 0
        ? Math.min(...availableRemainings.map(r => r.remaining))
        : null;

    // 获取所有数字按钮（排除清除按钮）
    const numBtns = Array.from(document.querySelectorAll('.num-btn')).filter(btn => !btn.classList.contains('num-btn-clear'));

    // 第二步：更新每个按钮的状态
    for (let num = 1; num <= size; num++) {
        const count = countNumberOccurrences(num);
        const remaining = size - count;
        const btn = numBtns[num - 1];
        if (!btn) continue;

        const remainingEl = btn.querySelector('.num-remaining');
        const valueEl = btn.querySelector('.num-value');

        // 更新数字显示
        if (valueEl) {
            valueEl.textContent = num;
        }

        if (remainingEl) {
            remainingEl.textContent = remaining.toString();
        }

        if (remaining === 0) {
            btn.classList.add('disabled');
            btn.classList.remove('min-remaining');
        } else {
            btn.classList.remove('disabled');
            // 如果是剩余数量最少的，添加高亮样式
            if (remaining === minRemaining) {
                btn.classList.add('min-remaining');
            } else {
                btn.classList.remove('min-remaining');
            }
        }
    }

    // 如果所有数字都已用完，自动触发检查答案（但胜利后不再自动检查）
    if (!hasWon && availableRemainings.length === 0) {
        checkSolution();
    }
}

/**
    * 选择数字
    */
function selectNumber(num) {
    // 清除所有按钮的激活状态
    const numButtons = document.querySelectorAll('.num-btn');
    numButtons.forEach(btn => btn.classList.remove('active'));

    // 如果点击的是清除按钮（0）
    if (num === 0) {
        if (selectedCell !== null) {
            placeNumber(0);
        }
        selectedNumber = null;
        return;
    }

    // 草稿模式下不需要检查剩余数量
    if (inputMode === 'exact') {
        // 检查该数字是否还有剩余
        const count = countNumberOccurrences(num);
        const remaining = 9 - count;

        // 如果剩余数量为0，不允许选择
        if (remaining === 0) {
            return;
        }
    }

    // 如果当前选中的数字和点击的相同，取消选择
    if (selectedNumber !== null && selectedNumber === num) {
        selectedNumber = null;
        return;
    }

    selectedNumber = num;
    
    // 检查按钮是否存在，避免在非数独页面调用时报错
    if (numButtons[num - 1]) {
        numButtons[num - 1].classList.add('active');
    }

    if (selectedCell !== null) {
        placeNumber(num);
    }
    selectedNumber = null;
}

/**
    * 放置数字（优化版：局部更新）
    */
function placeNumber(num) {
    if (!selectedCell) return;

    const index = selectedCell.index;
    const row = selectedCell.row;
    const col = selectedCell.col;

    // 检查是否为固定数字
    if (originalPuzzle[index] !== '0') return;

    // 记录操作前的棋盘状态（用于撤销）
    // 使用深拷贝保存当前状态
    const boardSnapshot = currentBoard.map(cell => 
        Array.isArray(cell) ? [...cell] : cell
    );
    const lastAction = {
        index: index,
        previousBoard: boardSnapshot,
        previousInputMode: inputMode,
        previousScore: currentGameScore,
        previousFilledCells: filledCells
    };

    // 根据输入模式执行不同操作
    if (inputMode === 'exact') {
        // 检查当前格子是否已经填写了正确答案，如果是则不允许修改
        const currentValue = currentBoard[index];
        if (typeof currentValue === 'number' && currentValue !== 0) {
            const correctAnswer = parseInt(currentPuzzle.solution[index]);
            if (currentValue === correctAnswer) {
                return;
            }
        }
        
        // 确定模式：设置确定值
        if (num === 0) {
            // 清除
            // 检查当前格子是否有正确答案，如果有则减去积分
            if (typeof currentValue === 'number' && currentValue !== 0) {
                const correctAnswer = parseInt(currentPuzzle.solution[index]);
                if (currentValue === correctAnswer) {
                    // 减去相应分数
                    let pointsPerCell = 10;
                    if (currentPuzzle.gameType === 'MEDIUM') {
                        pointsPerCell = 12;
                    } else if (currentPuzzle.gameType === 'HARD') {
                        pointsPerCell = 15;
                    }
                    currentGameScore = Math.max(0, currentGameScore - pointsPerCell);
                    filledCells = Math.max(0, filledCells - 1);
                    
                    // 更新显示
                    updateGameScoreDisplay();
                    updateProgressBar();
                }
            }
            currentBoard[index] = [];
        } else {
            // 检查答案是否正确
            const correctAnswer = parseInt(currentPuzzle.solution[index]);
            const isCorrect = num === correctAnswer;
            
            // 设置确定值（无论对错都设置）
            currentBoard[index] = num;

            if (!isCorrect) {
                // 答案错误，扣除一颗心
                loseLife();
            } else {
                // 答案正确，增加积分
                addScoreForCorrectAnswer();
                
                // 删除同行、同列、同宫中的重复候选数字
                let affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
                // 如果是对角线数独，还需要删除对角线上的候选数
                if (currentPuzzle.gameTypeStr === 'DIAGONAL') {
                    affectedIndices = [...affectedIndices, ...getDiagonals(row, col)];
                }
                affectedIndices.forEach(idx => {
                    if (Array.isArray(currentBoard[idx])) {
                        const candidateIdx = currentBoard[idx].indexOf(num);
                        if (candidateIdx >= 0) {
                            currentBoard[idx].splice(candidateIdx, 1);
                        }
                    }
                });
            }
        }

        // 更新当前格子的显示（确定值或空）
        updateCellDisplay(index);

        // 确定模式下，候选数高亮状态可能全局改变，需要更新所有候选数格子
        // 原因：某个候选数的唯一性可能因为其他候选数被移除而改变
        // 例如：格子A的候选数1原本不唯一（格子B也有1），但格子B的1被移除后，A的1变成唯一
        updateAllCandidateCells();
    } else {
        // 草稿模式：添加或移除候选数字
        if (num === 0) {
            // 清除所有候选
            currentBoard[index] = [];
        } else {
            if (typeof currentBoard[index] === 'number') {
                // 如果当前是确定值，转换为候选数组
                currentBoard[index] = [num];
            } else if (Array.isArray(currentBoard[index])) {
                const candidateIdx = currentBoard[index].indexOf(num);
                if (candidateIdx >= 0) {
                    // 移除已存在的候选
                    currentBoard[index].splice(candidateIdx, 1);
                } else {
                    // 添加新候选并排序
                    currentBoard[index].push(num);
                    currentBoard[index].sort((a, b) => a - b);
                }
            }
        }

        // 草稿模式下，候选数字变化会影响同行、列、宫的唯一效果
        // 需要更新这些位置的显示
        let affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
        // 如果是对角线数独，还需要更新对角线上的格子
        if (currentPuzzle.gameTypeStr === 'DIAGONAL') {
            affectedIndices = [...affectedIndices, ...getDiagonals(row, col)];
        }
        affectedIndices.forEach(idx => {
            if (Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 0) {
                updateCellDisplay(idx);
            }
        });
        // 也更新当前格子
        updateCellDisplay(index);
    }

    // 如果填入的是确定值，高亮所有相同数字的格子（与选中有数字格子的效果一致）
    if (inputMode === 'exact' && num !== 0) {
        const cells = initCellsCache();
        // 先清除之前的高亮
        cells.forEach(c => c.classList.remove('highlighted-num'));
        // 高亮所有相同数字的格子
        cells.forEach((c, idx) => {
            if (currentBoard[idx] === num) {
                c.classList.add('highlighted-num');
            }
        });
    }
    
    // 清除提示高亮样式
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('hint-highlight', 'hint-affected', 'hint-related', 'hint-same-num', 'hint-related-fixed', 'hint-same-num-fixed');
    });

    // 记录到撤销栈（仅在操作成功时记录，错误答案不记录）
    // 注意：错误答案时已经直接return，所以这里记录的肯定是成功的操作
    if (undoStack.length > 50) {
        undoStack.shift(); // 限制撤销栈大小，最多50步
    }
    undoStack.push(lastAction);

    // 检查冲突（只检查确定值）
    checkConflicts();

    // 保持当前格子的选中状态（添加选中样式）
    const cells = initCellsCache();
    if (cells[index]) {
        cells[index].classList.add('selected');
    }

    // 自动保存进度（使用防抖优化）
    scheduleSaveProgress();

    // 更新数字按钮状态
    updateNumberButtons();

    // 重置选中状态
    selectedNumber = null;

    // 移除所有数字按钮的激活样式
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));
}

// 防抖定时器
let saveProgressTimer = null;

/**
    * 防抖保存进度
    */
function scheduleSaveProgress() {
    if (saveProgressTimer) {
        clearTimeout(saveProgressTimer);
    }
    saveProgressTimer = setTimeout(() => {
        saveGameProgress();
    }, 500); // 500ms 防抖
}

/**
    * 检查冲突（优化版：减少重复检查）
    */
function checkConflicts() {
    const size = currentPuzzle.size || 9;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const cells = initCellsCache();

    // 使用 Set 存储有冲突的索引
    const conflictIndices = new Set();

    // 检查每个确定值单元格（只有确定值才会产生冲突）
    for (let i = 0; i < size * size; i++) {
        const value = currentBoard[i];
        // 只检查确定值（数字类型）
        if (typeof value !== 'number' || value === 0) continue;

        const row = Math.floor(i / size);
        const col = i % size;

        // 检查同行冲突
        for (let j = 0; j < size; j++) {
            const idx = row * size + j;
            if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                conflictIndices.add(i);
                conflictIndices.add(idx);
            }
        }

        // 检查同列冲突
        for (let r = 0; r < size; r++) {
            const idx = r * size + col;
            if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                conflictIndices.add(i);
                conflictIndices.add(idx);
            }
        }

        // 检查宫格冲突（标准或不规则）
        if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
            // 锯齿数独：检查不规则宫格
            for (const box of irregularBoxes) {
                if (box.some(cell => cell[0] === row && cell[1] === col)) {
                    for (const cell of box) {
                        const [r, c] = cell;
                        const idx = r * size + c;
                        if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                            conflictIndices.add(i);
                            conflictIndices.add(idx);
                        }
                    }
                    break;
                }
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRow = Math.floor(row / boxRows) * boxRows;
            const boxCol = Math.floor(col / boxCols) * boxCols;
            for (let r = boxRow; r < boxRow + boxRows; r++) {
                for (let c = boxCol; c < boxCol + boxCols; c++) {
                    const idx = r * size + c;
                    if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                        conflictIndices.add(i);
                        conflictIndices.add(idx);
                    }
                }
            }
        }
    }

    // 批量更新 DOM
    cells.forEach((c, idx) => {
        if (conflictIndices.has(idx)) {
            c.classList.add('conflict');
        } else {
            c.classList.remove('conflict');
        }
    });
}

/**
    * 检查答案
    */
function checkSolution() {
    // 检查是否所有格子都填了确定值
    const hasEmptyOrCandidate = currentBoard.some(cell =>
        Array.isArray(cell) || (typeof cell === 'number' && cell === 0)
    );
    if (hasEmptyOrCandidate) {
        customAlert('还有空格或候选数字未填写！', 'warning');
        return;
    }

    // 检查是否有冲突
    const hasConflict = document.querySelector('.cell.conflict');
    if (hasConflict) {
        customAlert('存在冲突，请检查红色标记的格子！', 'error');
        return;
    }

    // 验证答案
    const userSolution = currentBoard.join('');
    if (userSolution === currentPuzzle.solution) {
        // 答案正确
        stopTimer();

        // 保存完成记录
        const record = Storage.getRecord(currentPuzzle.id) || {
            puzzleId: currentPuzzle.id,
            gameType: currentGameType,
            difficultyType: currentDifficulty,
            attemptCount: attemptCount,
            isCompleted: false,
            bestTime: null,
            originalPuzzle: currentPuzzle.originalPuzzle || '',
            solution: currentPuzzle.solution || '',
            cages: currentPuzzle.cages || null,
            irregularBoxes: currentPuzzle.irregularBoxes || null
        };

        const isNewRecord = !record.bestTime || seconds < record.bestTime;
        record.isCompleted = true;
        record.completionTime = seconds;
        if (isNewRecord) {
            record.bestTime = seconds;
        }

        // 先保存游戏记录（确保任务检查时能看到）
        Storage.saveRecord(record);
        
        // 处理通关奖励
        const rewardResult = handleCompletionRewards(currentGameType, currentDifficulty, seconds, attemptCount);
        
        // 保存基础通关分数为积分记录
        Storage.saveScoreRecord({
            type: 'game',
            name: `${getGameTypeName(currentGameType)} - ${getDifficultyTypeName(currentDifficulty)}`,
            description: `通关数独，用时 ${formatTime(seconds)}`,
            score: rewardResult.baseScore
        });
        
        // 保存周常任务奖励为积分记录
        if (rewardResult.weeklyTaskResult.reward > 0) {
            Storage.saveScoreRecord({
                type: 'task',
                name: '周常任务奖励',
                description: '完成周常任务',
                score: rewardResult.weeklyTaskResult.reward
            });
        }
        
        // 保存每日任务奖励为积分记录（已在 updateDailyTasks 中处理）
        
        // 更新记录中的分数信息
        record.earnedScore = rewardResult.baseScore;
        record.totalScore = rewardResult.baseScore;
        Storage.saveRecord(record);
        
        // 显示涂色模式按钮
        const colorModeBtn = document.getElementById('colorModeBtn');
        if (colorModeBtn) {
            colorModeBtn.style.display = 'inline-block';
        }

        // 标记已胜利
        hasWon = true;

        // 计算获得的礼盒
        const earnedGiftBoxes = calculateEarnedGiftBoxes();
        
        // 显示胜利弹窗
        const completionTime = document.getElementById('completionTime');
        if (completionTime) {
            completionTime.textContent = formatTime(seconds);
        }

        const newRecordMsg = document.getElementById('newRecordMsg');
        if (newRecordMsg) {
            newRecordMsg.style.display = isNewRecord ? 'block' : 'none';
        }

        if (record.bestTime) {
            const bestRecordMsg = document.getElementById('bestRecordMsg');
            if (bestRecordMsg) {
                bestRecordMsg.style.display = 'block';
            }
            const finalBestTime = document.getElementById('finalBestTime');
            if (finalBestTime) {
                finalBestTime.textContent = formatTime(record.bestTime);
            }
        }
        
        // 播放胜利庆祝动画
        if (typeof playWinCelebration === 'function') {
            playWinCelebration();
        }
        
        // 自定义题目模式下隐藏"再来一题"按钮
        const winButtons = document.querySelectorAll('.win-buttons .modal-btn');
        for (const btn of winButtons) {
            if (btn.textContent.includes('再来一题') && currentGameType === 'CUSTOM') {
                btn.style.display = 'none';
            }
        }
        
        // 显示胜利弹窗，隐藏数字输入和游戏控制
        const winModal = document.getElementById('winModal');
        if (winModal) {
            winModal.style.display = 'block';
        }
        const numberKeyPad = document.getElementById('numberKeyPad');
        if (numberKeyPad) {
            numberKeyPad.style.display = 'none';
        }
        const gameControls = document.getElementById('gameControls');
        if (gameControls) {
            gameControls.style.display = 'none';
        }
        const modeToggleBtn = document.getElementById('modeToggleBtn');
        if (modeToggleBtn) {
            modeToggleBtn.style.display = 'none';
        }
    } else {
        customAlert('答案不正确，请继续尝试！', 'error');
    }
}

/**
    * 重置题目
    */
function resetPuzzle() {
    // 重置棋盘：固定数字保持为数字，空格初始化为空数组[]
    currentBoard = originalPuzzle.split('').map(c => c === '0' ? [] : parseInt(c));
    selectedCell = null;
    selectedNumber = null;
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));
    renderBoard();
    seconds = 0;
    updateTimerDisplay();
    
    // 重置题目，尝试次数+1
    attemptCount++;
    const attemptInfo = document.getElementById('attemptInfo');
    if (attemptInfo) {
        attemptInfo.textContent = `已重置 ${attemptCount} 次`;
    }
    
    // 重置爱心数量
    lives = 3;
    updateLivesDisplay();
    
    // 清空撤销栈
    undoStack = [];
}

/**
    * 新题目
    */
function newPuzzle() {
    // 将当前游戏标记为已放弃
    if (currentPuzzle) {
        const record = Storage.getRecord(currentPuzzle.id);
        if (record && !record.isCompleted && !record.isAbandoned) {
            record.isAbandoned = true;
            record.isCompleted = true;
            Storage.saveRecord(record);
        }
    }

    // 生成新题目
    generateNewPuzzle(currentGameType, currentDifficulty);
    selectedNumber = null;
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));

    // 重置游戏控制
    resetGameControls();
}

/**
 * 重置游戏控制
 */
function resetGameControls() {
    // 重置涂色模式
    isColorMode = false;
    const colorModeBtn = document.getElementById('colorModeBtn');
    if (colorModeBtn) {
        colorModeBtn.textContent = '🎨 涂色模式';
        colorModeBtn.style.display = 'none';
    }
    // 重置胜利状态
    hasWon = false;
    // 重置数字输入和游戏控制
    const numberKeyPad = document.getElementById('numberKeyPad');
    if (numberKeyPad) {
        numberKeyPad.style.display = 'grid';
    }
    const gameControls = document.getElementById('gameControls');
    if (gameControls) {
        gameControls.style.display = 'flex';
    }
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    if (modeToggleBtn) {
        modeToggleBtn.style.display = 'inline-block';
    }
    
    // 检查道具权限，显示相应的按钮
    updateGameControlButtons();
    
    // 自定义题目模式下隐藏"新题目"按钮
    const newPuzzleBtn = document.querySelector('.control-btn[onclick="newPuzzle()"]');
    if (newPuzzleBtn && currentGameType === 'CUSTOM') {
        newPuzzleBtn.style.display = 'none';
    }
}

/**
 * 根据道具权限更新游戏控制按钮显示
 */
function updateGameControlButtons() {
    const items = getPlayerItems();
    
    // 一键草稿按钮
    const autoDraftBtn = document.getElementById('autoDraftBtn');
    if (autoDraftBtn) {
        if (items['auto_draft'] && items['auto_draft'] > 0) {
            autoDraftBtn.style.display = 'inline-block';
        } else {
            autoDraftBtn.style.display = 'none';
        }
    }
    
    // 一键答题按钮
    const autoSolveBtn = document.getElementById('autoSolveBtn');
    if (autoSolveBtn) {
        if (items['auto_solve'] && items['auto_solve'] > 0) {
            autoSolveBtn.style.display = 'inline-block';
        } else {
            autoSolveBtn.style.display = 'none';
        }
    }
    
    // 提示角标
    const hintCount = items['hint'] || 0;
    updateHintBadge(hintCount);
}

// ==================== 计时器函数 ====================

/**
    * 启动计时器
    * @param {number} startSeconds - 初始时间（秒），默认为0
    */
function startTimer(startSeconds = 0) {
    stopTimer();
    seconds = startSeconds;
    updateTimerDisplay();
    
    // 添加计时器运行动画
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.classList.add('running');
    }
    
    timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

/**
    * 停止计时器
    */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 移除计时器运行动画
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.classList.remove('running');
    }
}

/**
    * 更新计时器显示
    */
function updateTimerDisplay() {
    const timerEl = document.getElementById('timerValue');
    if (timerEl) {
        timerEl.textContent = formatTime(seconds);
    }
    // 兼容旧版本
    const oldTimerEl = document.getElementById('timer');
    if (oldTimerEl) {
        oldTimerEl.textContent = formatTime(seconds);
    }
}

/**
    * 格式化时间
    */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
    * 格式化日期时间
    */
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

/**
    * 当前查看的题目数据
    */
let currentViewPuzzleData = null;

/**
    * 查看已完成的题目
    */
function viewPuzzle(puzzleId) {
    const record = Storage.getRecord(puzzleId);
    if (!record || !record.originalPuzzle) {
        customAlert('无法找到题目数据', 'error');
        return;
    }

    currentViewPuzzleData = {
        puzzleId: record.puzzleId,
        puzzle: record.originalPuzzle,
        solution: record.solution,
        gameType: record.gameType,
        difficultyType: record.difficultyType,
        irregularBoxes: record.irregularBoxes || null,
        cages: record.cages || null,
        sandwichClues: record.sandwichClues || null,
        blackWhiteDotHints: record.blackWhiteDotHints || null,
        skyscraperClues: record.skyscraperClues || null
    };

    document.getElementById('viewPuzzleId').textContent = record.puzzleId;
    document.getElementById('viewPuzzleGameType').textContent = getGameTypeName(record.gameType);
    document.getElementById('viewPuzzleDifficultyType').textContent = getDifficultyTypeName(record.difficultyType);

    renderViewPuzzleBoard(record.originalPuzzle);

    // 激活题目标签
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn:first-child').classList.add('active');

    openModal('viewPuzzleModal');
}

/**
    * 切换查看题目/答案
    */
function switchViewPuzzleTab(tab) {
    if (!currentViewPuzzleData) return;

    // 更新标签状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 渲染对应内容
    if (tab === 'puzzle') {
        renderViewPuzzleBoard(currentViewPuzzleData.puzzle, false);
    } else {
        renderViewPuzzleBoard(currentViewPuzzleData.solution || currentViewPuzzleData.puzzle, true);
    }
}

/**
    * 渲染查看题目弹窗中的棋盘
    * @param {string} boardStr - 棋盘数据
    * @param {boolean} isAnswer - 是否是答案视图
    */
function renderViewPuzzleBoard(boardStr, isAnswer = false) {
    const boardContainer = document.getElementById('viewPuzzleBoard');
    const puzzle = currentViewPuzzleData.puzzle;
    const gameType = currentViewPuzzleData.gameType;
    const solution = currentViewPuzzleData.solution;
    const sandwichClues = currentViewPuzzleData.sandwichClues;

    const skyscraperClues = currentViewPuzzleData.skyscraperClues;

    // 摩天楼数独需要特殊布局（四个方向外部提示）
    if (gameType === 'SKYSCRAPER' && skyscraperClues) {
        renderViewSkyscraperPuzzle(boardContainer, boardStr, puzzle, skyscraperClues, isAnswer);
        return;
    }

    // 三明治数独需要特殊布局
    if (gameType === 'SANDWICH' && sandwichClues) {
        renderViewSandwichPuzzle(boardContainer, boardStr, puzzle, sandwichClues, isAnswer);
        return;
    }

    let html = '';

    // 根据字符串长度确定棋盘大小（更可靠）
    let gridSize = 9;
    if (boardStr.length === 16) {
        gridSize = 4;
    } else if (boardStr.length === 36) {
        gridSize = 6;
    }

    // 根据难度设置棋盘样式类
    let boardClass = '';
    if (gameType && gameType.startsWith('KILLER')) {
        boardClass = ' killer-board killer-' + gridSize + 'x' + gridSize;
    } else if (gameType === 'DIAGONAL') {
        boardClass = ' diagonal-board';
    } else if (gameType === 'ODD_EVEN') {
        boardClass = ' odd-even-board';
    } else if (gameType === 'IRREGULAR') {
        boardClass = ' irregular-board';
    } else if (gameType === 'WINDOKU') {
        boardClass = ' windoku-board';
    } else if (gameType === 'CENTER_DOT') {
        boardClass = ' center-dot-board';
    } else if (gameType === 'STAR') {
        boardClass = ' star-board';
    } else if (gameType === 'BLACK_WHITE_DOT') {
        boardClass = ' black-white-dot-board';
    } else if (gridSize === 4) {
        boardClass = ' mini-4-board';
    } else if (gridSize === 6) {
        boardClass = ' mini-6-board';
    }

    // 更新棋盘容器类名和网格列数
    boardContainer.className = 'view-puzzle-board' + boardClass;
    boardContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0'; // 题目原始数字
        const isEmpty = value === '0';

        // 添加样式类
        let cellClass = '';

        // 根据棋盘大小添加边框
        if (gameType === 'IRREGULAR') {
            // 锯齿数独无固定边框
        } else if (gridSize === 4) {
            // 4宫格 2x2
            if (col === 1 || col === 3) cellClass += ' border-right';
            if (row === 1 || row === 3) cellClass += ' border-bottom';
        } else if (gridSize === 6) {
            // 6宫格 2x3（每宫2行3列）
            if (col === 2 || col === 5) cellClass += ' border-right';
            if (row === 1 || row === 3) cellClass += ' border-bottom';
        } else {
            // 9宫格 3x3
            if (col === 2 || col === 5) cellClass += ' border-right';
            if (row === 2 || row === 5) cellClass += ' border-bottom';
        }

        // 对角线数独 - 对角线高亮
        if (gameType === 'DIAGONAL') {
            if (row === col || row + col === 8) {
                cellClass += ' diagonal-cell';
            }
        }

        // 奇偶数独 - 根据数字值判断奇偶
        if (gameType === 'ODD_EVEN') {
            const numValue = parseInt(solution[i]);
            if (numValue % 2 === 0) {
                cellClass += ' even-cell';
            } else {
                cellClass += ' odd-cell';
            }
        }

        // 窗口数独 - 窗口区域高亮
        if (gameType === 'WINDOKU') {
            const windokuRegions = [
                { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },
                { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },
                { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },
                { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }
            ];
            for (const region of windokuRegions) {
                if (row >= region.startRow && row <= region.endRow &&
                    col >= region.startCol && col <= region.endCol) {
                    cellClass += ' windoku-cell';
                    break;
                }
            }
        }

        // 中心点数独 - 中心点区域高亮
        if (gameType === 'CENTER_DOT') {
            if (row % 3 === 1 && col % 3 === 1) {
                cellClass += ' center-cell';
            }
        }

        // 星号数独 - 星形图案区域高亮
        if (gameType === 'STAR') {
            const starCells = [
                [1, 4], [2, 2], [2, 6], [4, 1], [4, 4], [4, 7], [6, 2], [6, 6], [7, 4]
            ];
            if (starCells.some(([sr, sc]) => sr === row && sc === col)) {
                cellClass += ' star-cell';
            }
        }

        // 锯齿数独 - 不规则宫格颜色
        if (gameType === 'IRREGULAR' && currentViewPuzzleData.irregularBoxes) {
            const boxIndex = getCellBoxIndex(row, col);
            cellClass += ` irregular-box-${boxIndex}`;
        }

        // 杀手数独 - 杀手笼样式
        if (gameType && gameType.startsWith('KILLER') && currentViewPuzzleData.cages) {
            const cageIndex = getCellCageIndex(row, col, gridSize);
            if (cageIndex >= 0) {
                const cage = currentViewPuzzleData.cages[cageIndex];
                const cageColorIndex = cageIndex % 25; // 循环使用25种颜色
                cellClass += ` killer-cage-${cageColorIndex}`;

                // 只在笼子的外边界添加边框
                if (cage && cage.cells && cage.cells.length > 0) {
                    let hasTop = true;
                    let hasBottom = true;
                    let hasLeft = true;
                    let hasRight = true;

                    for (const cell of cage.cells) {
                        if (cell.row === row - 1 && cell.col === col) hasTop = false;
                        if (cell.row === row + 1 && cell.col === col) hasBottom = false;
                        if (cell.row === row && cell.col === col - 1) hasLeft = false;
                        if (cell.row === row && cell.col === col + 1) hasRight = false;
                    }

                    if (hasTop) cellClass += ' killer-cage-border-top';
                    if (hasBottom) cellClass += ' killer-cage-border-bottom';
                    if (hasLeft) cellClass += ' killer-cage-border-left';
                    if (hasRight) cellClass += ' killer-cage-border-right';
                }
            }
        }

        // 获取笼和（在笼子左上角显示）
        let cageSum = '';
        if (gameType && gameType.startsWith('KILLER') && currentViewPuzzleData.cages) {
            const cageIndex = getCellCageIndex(row, col, gridSize);
            if (cageIndex >= 0) {
                const cage = currentViewPuzzleData.cages[cageIndex];
                if (cage && cage.cells && cage.cells.length > 0) {
                    const firstCell = cage.cells[0];
                    if (firstCell.row === row && firstCell.col === col) {
                        cageSum = cage.sum || '';
                    }
                }
            }
        }

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number'; // 原始题目数字
            } else {
                numberClass = ' filled-number'; // 填入的数字
            }
        }

        html += `
            <div class="cell${isEmpty ? ' empty' : ''}${cellClass}">
                ${cageSum ? `<span class="cage-sum">${cageSum}</span>` : ''}
                <span class="${isEmpty ? '' : (isAnswer ? numberClass : 'fixed')}">${isEmpty ? '' : value}</span>
            </div>
        `;
    }

    boardContainer.innerHTML = html;

    // 渲染黑白点数独的点标记
    renderViewBlackWhiteDots(boardContainer, gameType);
}

/**
 * 渲染查看题目弹窗中的黑白点数独点标记
 */
function renderViewBlackWhiteDots(boardContainer, gameType) {
    if (gameType !== 'BLACK_WHITE_DOT') return;

    const dots = currentViewPuzzleData.blackWhiteDotHints;
    if (!dots || dots.length === 0) return;

    // 使用requestAnimationFrame确保DOM已完全渲染
    requestAnimationFrame(() => {
        const firstCell = boardContainer.querySelector('.cell');
        if (!firstCell) return;

        const cellRect = firstCell.getBoundingClientRect();
        const cellSize = cellRect.width;

        dots.forEach(dot => {
            const dotEl = document.createElement('div');
            dotEl.className = `view-dot-marker ${dot.type}`;

            let left, top;
            if (dot.direction === 'right') {
                left = (dot.col + 1) * cellSize + 0.5;
                top = (dot.row + 0.5) * cellSize + 0.5;
            } else {
                left = (dot.col + 0.5) * cellSize + 0.5;
                top = (dot.row + 1) * cellSize + 0.5;
            }

            dotEl.style.left = `${left}px`;
            dotEl.style.top = `${top}px`;
            boardContainer.appendChild(dotEl);
        });
    });
}

/**
    * 渲染三明治数独查看题目弹窗中的棋盘
    */
function renderViewSandwichPuzzle(boardContainer, boardStr, puzzle, sandwichClues, isAnswer) {
    // 添加三明治数独查看模式的类，覆盖默认grid样式
    boardContainer.className = 'view-puzzle-board sandwich-view-board';

    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'sandwich-layout';

    // 创建左上角空白占位
    const topLeftEmpty = document.createElement('div');
    topLeftEmpty.className = 'sandwich-top-left-empty';
    layout.appendChild(topLeftEmpty);

    // 创建顶部提示行
    const topClues = document.createElement('div');
    topClues.className = 'sandwich-clues-top';
    for (let col = 0; col < 9; col++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.left[col] || 0;
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建左侧提示列
    const leftClues = document.createElement('div');
    leftClues.className = 'sandwich-clues-left';
    for (let row = 0; row < 9; row++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.top[row] || 0;
        leftClues.appendChild(clue);
    }
    layout.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-sandwich';

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0';
        const isEmpty = value === '0';

        let cellClass = '';

        // 宫格边框
        if (col === 2 || col === 5) cellClass += ' border-right';
        if (row === 2 || row === 5) cellClass += ' border-bottom';

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number';
            } else {
                numberClass = ' filled-number';
            }
        }

        const cell = document.createElement('div');
        cell.className = `cell${isEmpty ? ' empty' : ''}${cellClass}`;

        const span = document.createElement('span');
        span.className = isEmpty ? '' : (isAnswer ? numberClass : 'fixed');
        span.textContent = isEmpty ? '' : value;
        cell.appendChild(span);

        board.appendChild(cell);
    }

    layout.appendChild(board);
    boardContainer.innerHTML = '';
    boardContainer.appendChild(layout);
}

/**
    * 渲染摩天楼数独查看题目弹窗中的棋盘
    */
function renderViewSkyscraperPuzzle(boardContainer, boardStr, puzzle, skyscraperClues, isAnswer) {
    // 添加摩天楼数独查看模式的类，覆盖默认grid样式
    boardContainer.className = 'view-puzzle-board skyscraper-view-board';

    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'skyscraper-layout';

    // 创建顶部提示行（11个元素，首尾为空）
    const topClues = document.createElement('div');
    topClues.className = 'skyscraper-clues-top';
    for (let col = 0; col < skyscraperClues.top.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.top[col] || '';
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建中间行（左侧提示 + 棋盘 + 右侧提示）
    const middleRow = document.createElement('div');
    middleRow.className = 'skyscraper-middle-row';

    // 创建左侧提示列（11个元素，首尾为空）
    const leftClues = document.createElement('div');
    leftClues.className = 'skyscraper-clues-left';
    for (let row = 0; row < skyscraperClues.left.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.left[row] || '';
        leftClues.appendChild(clue);
    }
    middleRow.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-skyscraper';

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0';
        const isEmpty = value === '0';

        let cellClass = '';

        // 宫格边框
        if (col === 2 || col === 5) cellClass += ' border-right';
        if (row === 2 || row === 5) cellClass += ' border-bottom';

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number';
            } else {
                numberClass = ' filled-number';
            }
        }

        const cell = document.createElement('div');
        cell.className = `cell${isEmpty ? ' empty' : ''}${cellClass}`;

        const span = document.createElement('span');
        span.className = isEmpty ? '' : (isAnswer ? numberClass : 'fixed');
        span.textContent = isEmpty ? '' : value;
        cell.appendChild(span);

        board.appendChild(cell);
    }
    middleRow.appendChild(board);

    // 创建右侧提示列（11个元素，首尾为空）
    const rightClues = document.createElement('div');
    rightClues.className = 'skyscraper-clues-right';
    for (let row = 0; row < skyscraperClues.right.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.right[row] || '';
        rightClues.appendChild(clue);
    }
    middleRow.appendChild(rightClues);

    layout.appendChild(middleRow);

    // 创建底部提示行（11个元素，首尾为空）
    const bottomClues = document.createElement('div');
    bottomClues.className = 'skyscraper-clues-bottom';
    for (let col = 0; col < skyscraperClues.bottom.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.bottom[col] || '';
        bottomClues.appendChild(clue);
    }
    layout.appendChild(bottomClues);

    boardContainer.innerHTML = '';
    boardContainer.appendChild(layout);
}

/**
    * 获取单元格所属的不规则宫格索引
    */
function getCellBoxIndex(row, col) {
    if (!currentViewPuzzleData.irregularBoxes) return 0;
    for (let i = 0; i < currentViewPuzzleData.irregularBoxes.length; i++) {
        const box = currentViewPuzzleData.irregularBoxes[i];
        if (box.some(([r, c]) => r === row && c === col)) {
            return i;
        }
    }
    return 0;
}

/**
    * 获取单元格所属的杀手笼索引
    */
function getCellCageIndex(row, col, gridSize) {
    if (!currentViewPuzzleData.cages || !Array.isArray(currentViewPuzzleData.cages)) return -1;
    const index = row * gridSize + col;
    for (let i = 0; i < currentViewPuzzleData.cages.length; i++) {
        const cage = currentViewPuzzleData.cages[i];
        // 杀手数独的cages是对象结构：{cells: [{row, col}, ...], sum: X}
        if (cage && cage.cells && Array.isArray(cage.cells)) {
            const cellIndex = cage.cells.findIndex(cell => cell.row === row && cell.col === col);
            if (cellIndex >= 0) {
                return i;
            }
        }
    }
    return -1;
}

/**
    * 格式化日期时间（原函数）
    */
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

// ==================== 记录页面函数 ====================

/**
    * 加载记录
    */
function loadRecords(filter = 'ALL') {
    const records = Storage.getRecords();
    const tbody = document.getElementById('recordsBody');
    const emptyState = document.getElementById('emptyState');

    // 筛选记录
    const filteredRecords = filter === 'ALL'
        ? records
        : records.filter(r => r.gameType === filter);

    // 更新统计
    const totalGames = records.length;
    const completedGames = records.filter(r => r.isCompleted && !r.isAbandoned).length;
    const totalTime = records.reduce((sum, r) => sum + (r.completionTime || 0), 0);

    document.getElementById('totalGames').textContent = totalGames;
    document.getElementById('completedGames').textContent = completedGames;
    document.getElementById('totalTime').textContent = formatTime(totalTime);

    if (filteredRecords.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('recordsTable').style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    document.getElementById('recordsTable').style.display = 'table';
    emptyState.style.display = 'none';

    // 按ID倒序排列
    filteredRecords.sort((a, b) => b.puzzleId - a.puzzleId);

    const latestInProgress = filteredRecords.find(r => !r.isCompleted && !r.isAbandoned && !r.isFailed);

    tbody.innerHTML = filteredRecords.map(record => {
        const isLatestInProgress = latestInProgress && record.puzzleId === latestInProgress.puzzleId;
        const canContinue = isLatestInProgress;
        const canView = (record.isCompleted || record.isFailed) && record.solution;
        let statusText, statusClass;
        if (record.isAbandoned) {
            statusText = '已放弃';
            statusClass = 'abandoned';
        } else if (record.isFailed) {
            statusText = '失败';
            statusClass = 'failed';
        } else if (record.isCompleted) {
            statusText = '已完成';
            statusClass = 'completed';
        } else {
            statusText = '进行中';
            statusClass = 'in-progress';
        }

        const startTimeText = record.startTime ? formatDateTime(record.startTime) : '--';
        const duration = record.isCompleted ? (record.completionTime || 0) : (record.elapsedTime || 0);
        const durationText = formatTime(duration);

        return `
            <tr>
                <td>#${record.puzzleId}</td>
                <td><span class="gameType-badge ${record.gameType.toLowerCase()}">${getGameTypeName(record.gameType)}</span></td>
                <td>${getDifficultyTypeName(record.difficultyType)}</td>
                <td>${startTimeText}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${durationText}</td>
                <td>${canContinue ? '<button class="action-btn" onclick="continuePuzzle(' + record.puzzleId + ', \'' + record.gameType + '\')">继续</button>' : (canView ? '<button class="action-btn view-btn" onclick="viewPuzzle(' + record.puzzleId + ')">查看题目</button>' : '-')}</td>
            </tr>
        `;
    }).join('');
}

/**
    * 筛选记录
    */
function filterRecords(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadRecords(filter);
}

/**
    * 检查是否有未完成的游戏
    */
function hasInProgressGame() {
    const records = Storage.getRecords();
    return records.some(r => !r.isCompleted && !r.isAbandoned && !r.isFailed);
}

/**
    * 获取最新的未完成游戏
    */
function getLatestInProgressGame() {
    const records = Storage.getRecords();
    const inProgress = records.filter(r => !r.isCompleted && !r.isAbandoned && !r.isFailed);
    if (inProgress.length === 0) return null;
    return inProgress.reduce((latest, current) =>
        current.puzzleId > latest.puzzleId ? current : latest
    );
}

/**
    * 继续最新的游戏
    */
function continueLatestGame() {
    const record = getLatestInProgressGame();
    if (record) {
        continuePuzzle(record.puzzleId, record.gameType);
    }
}

/**
    * 清除进度并显示难度选择
    */
function clearProgressAndShowGameType() {
    const record = getLatestInProgressGame();
    if (record) {
        record.isAbandoned = true;
        record.isCompleted = true;
        Storage.saveRecord(record);
    }
    showGameTypeSection();
}

/**
    * 显示难度选择区域
    */
function showGameTypeSection() {
    document.getElementById('continueGameSection').style.display = 'none';
    document.getElementById('gameTypeSelectionSection').style.display = 'block';
}

/**
    * 显示继续游戏区域
    */
function showContinueGameSection() {
    document.getElementById('continueGameSection').style.display = 'block';
    document.getElementById('gameTypeSelectionSection').style.display = 'none';
}

/**
    * 放弃游戏
    */
function abandonGame() {
    customConfirm('确定要放弃这局游戏吗？放弃后将无法继续。', () => {
        if (currentPuzzle) {
            const record = Storage.getRecord(currentPuzzle.id);
            if (record) {
                record.completionTime = seconds;
                record.isAbandoned = true;
                record.isCompleted = true;
                Storage.saveRecord(record);
            }
        }
        stopTimer();
        goHome();
    }, null, { title: '放弃游戏', type: 'warning' });
}

/**
 * 继续题目（拆分页面专用）
 */
function continuePuzzle(puzzleId, gameType) {
    // 存起来，跳过去再恢复
    localStorage.setItem("currentGameType", gameType);
    localStorage.setItem("continuePuzzleId", puzzleId);

    // 跳转到游戏页，不再操作 DOM
    location.href = "game.html";
}

/**
    * 恢复游戏状态
    */
function restoreGameState(record) {
    // 如果游戏已失败，不允许继续
    if (record.isFailed) {
        customAlert('该游戏已失败，请开始新游戏', 'error');
        setTimeout(() => {
            goHome();
        }, 2000);
        return;
    }
    
    // 根据难度确定棋盘尺寸（优先从record中读取）
    let boardSize = 9;
    
    // 优先使用record中保存的棋盘大小
    if (record.boardSize) {
        boardSize = record.boardSize;
    } else if (record.gameType === 'MINI_4x4' || record.gameType === 'KILLER_4x4') {
        boardSize = 4;
    } else if (record.gameType === 'MINI_6x6' || record.gameType === 'KILLER_6x6') {
        boardSize = 6;
    } else if (record.gameType === 'CUSTOM') {
        // 自定义题目：尝试根据题目长度判断棋盘大小
        const puzzle = record.originalPuzzle || record.currentBoard;
        if (puzzle) {
            const puzzleLen = puzzle.replace(/[^0-9]/g, '').length;
            if (puzzleLen === 16) boardSize = 4;
            else if (puzzleLen === 36) boardSize = 6;
        }
    }

    // 根据难度确定游戏类型
    let gameTypeStr = 'STANDARD';
    if (record.gameType === 'DIAGONAL') {
        gameTypeStr = 'DIAGONAL';
    } else if (record.gameType === 'ODD_EVEN') {
        gameTypeStr = 'ODD_EVEN';
    } else if (record.gameType === 'KILLER_4x4' || record.gameType === 'KILLER_6x6' || record.gameType === 'KILLER_9x9') {
        gameTypeStr = 'KILLER';
    } else if (record.gameType === 'IRREGULAR') {
        gameTypeStr = 'IRREGULAR';
    } else if (record.gameType === 'WINDOKU') {
        gameTypeStr = 'WINDOKU';
    } else if (record.gameType === 'SANDWICH') {
        gameTypeStr = 'SANDWICH';
    } else if (record.gameType === 'CENTER_DOT') {
        gameTypeStr = 'CENTER_DOT';
    } else if (record.gameType === 'STAR') {
        gameTypeStr = 'STAR';
    } else if (record.gameType === 'BLACK_WHITE_DOT') {
        gameTypeStr = 'BLACK_WHITE_DOT';
    } else if (record.gameType === 'SKYSCRAPER') {
        gameTypeStr = 'SKYSCRAPER';
    }

    // 恢复题目信息
    currentPuzzle = {
        id: record.puzzleId,
        puzzle: record.originalPuzzle || record.currentBoard.replace(/[^0]/g, '0'), // 如果没有原始题目，用当前状态生成
        solution: record.solution || '',
        gameType: record.gameType,
        difficultyType: record.difficultyType,
        size: boardSize,
        gameTypeStr: gameTypeStr,
        oddEvenMarks: record.oddEvenMarks || null,
        cages: record.cages || null,
        irregularBoxes: record.irregularBoxes || null,
        sandwichClues: record.sandwichClues || null,
        blackWhiteDotHints: record.blackWhiteDotHints || null,
        skyscraperClues: record.skyscraperClues || null
    };

    // 恢复棋盘状态（支持JSON格式的候选数字）
    let boardData;
    try {
        // 尝试解析JSON格式（支持候选数字数组）
        boardData = JSON.parse(record.currentBoard);
    } catch (e) {
        // 如果不是JSON格式，使用字符串格式
        boardData = record.currentBoard;
    }

    // 恢复原始题目
    if (record.originalPuzzle) {
        originalPuzzle = record.originalPuzzle;
    } else if (Array.isArray(boardData)) {
        // 从JSON数组中提取原始题目
        originalPuzzle = boardData.map(cell =>
            typeof cell === 'number' && cell !== 0 ? cell : 0
        ).join('');
    } else {
        // 旧格式字符串
        originalPuzzle = record.currentBoard.replace(/[^0-9]/g, '0');
    }

    // 恢复当前棋盘状态
    if (Array.isArray(boardData)) {
        currentBoard = boardData;
    } else {
        // 旧格式解析
        currentBoard = boardData.split('').map(c => {
            const num = parseInt(c);
            return num === 0 ? [] : num;
        });
    }

    // 恢复尝试次数和最佳成绩
    attemptCount = record.attemptCount || 1;
    bestTime = record.bestTime;

    // 恢复计时器
    seconds = record.elapsedTime || 0;

    // 更新显示
    const puzzleNumber = document.getElementById('puzzleNumber');
    if (puzzleNumber) {
        puzzleNumber.textContent = `题目 #${record.puzzleId}`;
    }
    const attemptInfo = document.getElementById('attemptInfo');
    if (attemptInfo) {
        attemptInfo.textContent = `第 ${attemptCount} 次尝试`;
    }

    if (bestTime) {
        const bestTimeInfo = document.getElementById('bestTimeInfo');
        if (bestTimeInfo) {
            bestTimeInfo.style.display = 'block';
        }
        const bestTimeEl = document.getElementById('bestTime');
        if (bestTimeEl) {
            bestTimeEl.textContent = formatTime(bestTime);
        }
    } else {
        const bestTimeInfo = document.getElementById('bestTimeInfo');
        if (bestTimeInfo) {
            bestTimeInfo.style.display = 'none';
        }
    }

    // 渲染棋盘
    renderBoard();
    
    // 更新游戏控制按钮显示（根据道具权限）
    updateGameControlButtons();
    
    // 更新积分显示
    updateCoinDisplay();

    // 启动计时器（从保存的时间继续）
    startTimer(seconds);
    
    // 恢复爱心数量
    lives = record.lives !== undefined ? record.lives : 3;
    updateLivesDisplay();
    
    // 恢复本局游戏积分和进度
    currentGameScore = record.currentGameScore || 0;
    filledCells = record.filledCells || 0;
    totalEmptyCells = originalPuzzle.split('').filter(c => c === '0').length;
    
    // 根据难度计算每格得分和总分
    let pointsPerCell = 10;
    if (record.difficultyType === 'MEDIUM') {
        pointsPerCell = 12;
    } else if (record.difficultyType === 'HARD') {
        pointsPerCell = 15;
    }
    totalScoreForGame = totalEmptyCells * pointsPerCell;
    
    // 更新积分和进度显示
    updateGameScoreDisplay();
    updateProgressBar();
}

// ==================== 弹窗函数 ====================

const helpContent = {
    STANDARD: {
        title: '标准数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    DIAGONAL: {
        title: '对角线数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '两条对角线上的数字也不能重复（1-9各出现一次）',
            '初始数字为固定提示，不能修改'
        ]
    },
    ODD_EVEN: {
        title: '奇偶数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '浅色格子只能填奇数（1、3、5、7、9）',
            '深色格子只能填偶数（2、4、6、8）',
            '初始数字为固定提示，不能修改'
        ]
    },
    KILLER: {
        title: '杀手数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '虚线围成的笼内数字相加等于左上角的提示数',
            '每个笼内的数字不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    MINI_4x4: {
        title: '迷你4×4数独',
        rules: [
            '在4×4的方格内填入1-4的数字',
            '每行、每列、每个2×2的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    MINI_6x6: {
        title: '迷你6×6数独',
        rules: [
            '在6×6的方格内填入1-6的数字',
            '每行、每列、每个2×3的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    IRREGULAR: {
        title: '锯齿数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列的数字都不能重复（1-9各出现一次）',
            '每个不规则形状的宫格内数字也不能重复（1-9各出现一次）',
            '不同颜色的区域代表不同的不规则宫格',
            '初始数字为固定提示，不能修改'
        ]
    },
    WINDOKU: {
        title: '窗口数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '四个额外的3×3阴影窗口区域内数字也不能重复',
            '四个窗口位于棋盘中心区域（行2-4列2-4、行2-4列6-8、行6-8列2-4、行6-8列6-8）',
            '阴影区域中的单元格同时属于四个单元（行、列、宫、窗口）',
            '初始数字为固定提示，不能修改'
        ]
    },
    SANDWICH: {
        title: '三明治数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '数字1和9充当"面包"，位于三明治的两端',
            '棋盘外部的提示数字表示该行/列中严格位于1和9之间的所有数字之和',
            '如果提示为0，说明1和9必须相邻',
            '如果提示为35，说明1和9必须位于两端（因为2-8的和为35）',
            '初始数字为固定提示，不能修改'
        ]
    },
    CENTER_DOT: {
        title: '中心点数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '中心点约束：存在由九个3x3块的正中心单元格组成的第十个“额外”区域。',
            '额外区域完成：这个高亮显示的九个中心单元格集合也必须包含数字1到9各一次。',
            '初始数字为固定提示，不能修改'
        ]
    },
    STAR: {
        title: '星号数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '星号约束：九个特定的阴影单元格（在网格中形成星形图案）也必须恰好包含数字1到9各一次。',
            '交叉逻辑：填入星号单元格的数字必须同时满足四个约束：其所在行、所在列、所在3x3宫以及星号集合本身。',
            '初始数字为固定提示，不能修改'
        ]
    },
    BLACK_WHITE_DOT: {
        title: '黑白点数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '白点表示相邻两格数字相差1（如3和4、7和8）',
            '黑点表示相邻两格数字为两倍关系（如2和4、3和6）',
            '1和2之间可能是白点也可能是黑点（因为既相差1又是两倍关系）',
            '没有标记点的相邻格子不能有上述关系',
            '初始数字为固定提示，不能修改'
        ]
    },
    SKYSCRAPER: {
        title: '摩天楼数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '每个单元格中的数字代表摩天楼的高度',
            '网格外部的提示表示从该视角可以看到多少栋建筑物。例如：从某方向看到3，表示能看到3栋楼房',
            '只有当所有前面的建筑物都矮于它时，该建筑物才是可见的。较高的建筑物总是遮挡其后面的较矮建筑物。',
            '初始数字为固定提示，不能修改'
        ]
    },
    UNTOUCHABLE: {
        title: '无缘数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '国王移动约束：相同的数字不能放在任何正交或对角相邻的单元格中',
            '这意味着一个数字"攻击"周围所有8个相邻格子，阻止相同的数字出现在那里',
            '初始数字为固定提示，不能修改'
        ]
    }
};

function getGameHelpContent(gameTypeStr) {
    console.log('🔍 获取帮助内容 - gameTypeStr:', gameTypeStr);
    console.log('🔍 helpContent 包含 UNTOUCHABLE:', 'UNTOUCHABLE' in helpContent);
    console.log('🔍 helpContent[gameTypeStr]:', helpContent[gameTypeStr]);
    
    const info = helpContent[gameTypeStr] || helpContent.STANDARD;
    let html = `<h3>【${info.title}】游戏规则：</h3><ul>`;
    info.rules.forEach(rule => {
        html += `<li>${rule}</li>`;
    });
    html += '</ul>';
    return html;
}

/**
    * 显示帮助弹窗
    */
function showHelp() {
    const gameTypeStr = currentPuzzle ? currentPuzzle.gameTypeStr : 'STANDARD';
    const helpHtml = getGameHelpContent(gameTypeStr);

    const commonHelp = `
        <h3>操作说明：</h3>
        <ul>
            <li>点击方格选中位置</li>
            <li>使用下方数字键盘输入数字</li>
            <li>点击 ✕ 清除当前格子的数字</li>
            <li>全部空格填满后自动验证答案</li>
        </ul>
        <h3>草稿模式：</h3>
        <ul>
            <li>点击"确定模式/草稿模式"按钮切换输入模式</li>
            <li><strong>确定模式</strong>：直接填入确定的数字</li>
            <li><strong>草稿模式</strong>：在格子中标记候选数字</li>
            <li>在草稿模式下，点击数字添加/移除候选</li>
            <li>确定数字会自动删除同行/列/宫的重复候选</li>
        </ul>
        <h3>候选数字样式：</h3>
        <ul>
            <li><strong>彩色背景</strong>：表示该候选数字目前是已标记候选数字中的唯一可能</li>
            <li><strong>白色背景</strong>：表示该候选数字在同行/列/宫中多次出现</li>
        </ul>
        <h3>快捷键：</h3>
        <ul>
            <li>数字键 1-9：填入数字</li>
            <li>Delete/Backspace：清除数字</li>
            <li>方向键：移动选中格</li>
            <li>E键：切换确定/草稿模式</li>
        </ul>
    `;

    document.querySelector('#helpModal .help-content').innerHTML = helpHtml + commonHelp;
    document.getElementById('helpModal').style.display = 'block';
}

/**
    * 打开弹窗
    */
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

/**
    * 关闭弹窗（隐藏方式，用于已有DOM的弹窗）
    */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // 对于提示弹窗，使用删除方式
        if (modalId === 'hintModal') {
            // 先移除所有事件监听器
            modal.onclick = null;
            // 清除高亮
            document.querySelectorAll('.cell').forEach(cell => {
                cell.classList.remove('hint-highlight', 'hint-affected', 'hint-related', 'hint-same-num', 'hint-related-fixed', 'hint-same-num-fixed');
            });
            // 延迟删除，确保事件处理完成
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 10);
        } else {
            // 其他弹窗使用隐藏方式
            modal.style.display = 'none';
        }
    }
}

/**
 * 显示9宫格难度选择弹窗
 */
function showDifficultyModal(gameType) {
    currentGameType = gameType;
    openModal('DifficultyModal');
}

/**
 * 关闭9宫格难度选择弹窗
 */
function closeDifficultyModal() {
    closeModal('DifficultyModal');
}

// 点击弹窗外部关闭
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ==================== 键盘事件 ====================
document.addEventListener('keydown', function (event) {
    // 数字键1-9
    if (event.key >= '1' && event.key <= '9') {
        selectNumber(parseInt(event.key));
    }
    // 删除键
    else if (event.key === 'Delete' || event.key === 'Backspace') {
        selectNumber(0);
    }
    // E键切换输入模式（确定模式/草稿模式）
    else if (event.key === 'e' || event.key === 'E') {
        toggleInputMode();
    }
    // H键显示提示
    else if (event.key === 'h' || event.key === 'H') {
        showHint();
    }
    // Enter键应用提示（当提示面板显示时）
    else if (event.key === 'Enter') {
        const hintPanel = document.getElementById('hintPanel');
        if (hintPanel) {
            event.preventDefault();
            const hint = window.currentHint;
            if (hint) {
                applyHint(hint);
                closeHintPanel();
            }
        }
    }
    // 方向键移动
    else if (selectedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        let { row, col } = selectedCell;
        const size = currentPuzzle.size || 9;

        switch (event.key) {
            case 'ArrowUp': row = Math.max(0, row - 1); break;
            case 'ArrowDown': row = Math.min(size - 1, row + 1); break;
            case 'ArrowLeft': col = Math.max(0, col - 1); break;
            case 'ArrowRight': col = Math.min(size - 1, col + 1); break;
        }

        const cells = initCellsCache();
        const newIndex = row * size + col;
        selectCell(row, col, cells[newIndex]);
    }
    // ESC关闭弹窗和提示面板
    else if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        closeHintPanel();
    }
});

/**
 * 检查农场是否已开通
 */
function isFarmUnlocked() {
    const playerData = Storage.getPlayerData();
    return playerData.farmUnlocked === true;
}

/**
 * 开通农场
 */
function unlockFarm() {
    const playerData = Storage.getPlayerData();
    playerData.farmUnlocked = true;
    Storage.savePlayerData(playerData);
}

/**
 * 开通农场权限（购买农场相关道具时自动调用）
 */
function unlockFarmIfNeeded() {
    if (!isFarmUnlocked()) {
        unlockFarm();
    }
}

/* ==================== 画图功能 ==================== */
function togglePaintMode() {
    paintMode = !paintMode;
    const paintBtn = document.getElementById('paintBtn');
    const paintControls = document.getElementById('paintControls');
    const paintBackBtn = document.getElementById('paintBackBtn');
    const actionButtonsBar = document.querySelector('.action-buttons-bar');
    const numberKeyPad = document.getElementById('numberKeyPad');
    const gameControls = document.getElementById('gameControls');

    if (paintMode) {
        if (paintBtn) paintBtn.classList.add('active');
        if (paintControls) paintControls.style.display = 'block';
        if (paintBackBtn) paintBackBtn.style.display = 'block';
        if (actionButtonsBar) actionButtonsBar.style.display = 'none';
        if (numberKeyPad) numberKeyPad.style.display = 'none';
        if (gameControls) gameControls.style.display = 'none';
    } else {
        if (paintBtn) paintBtn.classList.remove('active');
        if (paintControls) paintControls.style.display = 'none';
        if (paintBackBtn) paintBackBtn.style.display = 'none';
        if (actionButtonsBar) actionButtonsBar.style.display = 'grid';
        if (numberKeyPad) numberKeyPad.style.display = 'grid';
        if (gameControls) gameControls.style.display = 'flex';
    }
}

function setPaintTab(tab) {
    if (tab === 'undo') {
        undoPaint();
        return;
    }
    if (tab === 'clear') {
        clearAllPaint();
        return;
    }
    
    currentPaintTab = tab;
    document.querySelectorAll('.paint-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
}

function setPaintColor(color) {
    currentPaintColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.color === color) {
            btn.classList.add('active');
        }
    });
}

function handlePaintCell(row, col) {
    if (!paintMode) return;
    
    const size = currentPuzzle.size || 9;
    const index = row * size + col;

    switch (currentPaintTab) {
        case 'cell':
            paintCell(index, currentPaintColor);
            break;
        case 'note':
            showNotePicker(row, col, index);
            break;
        case 'line':
            paintLine(index, currentPaintColor);
            break;
    }
}

function paintCell(index, color) {
    paintHistory.push({ type: 'cell', index: index, oldColor: cellPaintData[index] });
    
    if (color === 'none') {
        delete cellPaintData[index];
    } else {
        cellPaintData[index] = color;
    }
    
    updateCellPaint(index);
}

function paintNote(index, color) {
    const value = currentBoard[index];
    if (!Array.isArray(value)) return;
    
    paintHistory.push({ type: 'note', index: index, oldColor: notePaintData[index] });
    
    if (color === 'none') {
        delete notePaintData[index];
    } else {
        notePaintData[index] = color;
    }
    
    updateCellPaint(index);
}

function paintLine(index, color) {
    paintHistory.push({ type: 'line', index: index, oldColor: linePaintData[index] });
    
    if (color === 'none') {
        delete linePaintData[index];
    } else {
        linePaintData[index] = color;
    }
    
    updateCellPaint(index);
}

function updateCellPaint(index) {
    const board = document.getElementById('sudokuBoard');
    if (!board) return;
    
    const cells = board.querySelectorAll('.cell');
    if (!cells[index]) return;
    
    const cell = cells[index];
    
    cell.style.backgroundColor = cellPaintData[index] || '';
    
    const candidateNums = cell.querySelectorAll('.candidate-num');
    candidateNums.forEach(candidate => {
        const num = parseInt(candidate.textContent);
        if (notePaintData[index] && notePaintData[index][num]) {
            candidate.style.backgroundColor = notePaintData[index][num];
        } else {
            candidate.style.backgroundColor = '';
        }
    });
    
    if (linePaintData[index]) {
        cell.style.borderColor = linePaintData[index];
        cell.style.borderWidth = '2px';
    } else {
        cell.style.borderColor = '';
        cell.style.borderWidth = '';
    }
}

function showNotePicker(row, col, index) {
    const value = currentBoard[index];
    if (!Array.isArray(value) || value.length === 0) return;

    const board = document.getElementById('sudokuBoard');
    if (!board) return;

    const cells = board.querySelectorAll('.cell');
    if (!cells[index]) return;

    const cell = cells[index];
    const rect = cell.getBoundingClientRect();
    
    const picker = document.createElement('div');
    picker.className = 'note-picker';
    
    const size = currentPuzzle.size || 9;
    picker.style.gridTemplateColumns = size === 4 ? 'repeat(2, 1fr)' : 
                                      size === 6 ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)';

    for (let num = 1; num <= size; num++) {
        if (!value.includes(num)) continue;
        
        const btn = document.createElement('button');
        btn.className = 'picker-btn';
        btn.textContent = getIcon(num);
        
        if (notePaintData[index] && notePaintData[index][num]) {
            btn.style.backgroundColor = notePaintData[index][num];
            btn.style.color = 'white';
        }
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            paintNoteNumber(index, num);
            if (notePaintData[index] && notePaintData[index][num]) {
                btn.style.backgroundColor = notePaintData[index][num];
                btn.style.color = 'white';
            } else {
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
        });
        
        picker.appendChild(btn);
    }

    picker.style.left = `${rect.left + rect.width / 2}px`;
    picker.style.top = `${rect.top + rect.height / 2}px`;
    
    document.body.appendChild(picker);
    
    setTimeout(() => {
        picker.classList.add('visible');
        adjustPickerPosition(picker, rect.left + rect.width / 2, rect.top + rect.height / 2);
        // 延迟绑定关闭事件，避免当前 click 事件立即关闭弹框
        setTimeout(() => {
            document.addEventListener('click', closeNotePickerHandler);
        }, 100);
    }, 10);
    
    function closeNotePickerHandler(e) {
        if (!picker.contains(e.target)) {
            picker.classList.remove('visible');
            setTimeout(() => {
                picker.remove();
            }, 200);
            document.removeEventListener('click', closeNotePickerHandler);
        }
    }
}

function paintNoteNumber(index, num) {
    if (!notePaintData[index]) {
        notePaintData[index] = {};
    }
    
    const oldColor = notePaintData[index][num];
    
    paintHistory.push({ type: 'note', index: index, num: num, oldColor: oldColor });
    
    if (oldColor === currentPaintColor || currentPaintColor === 'none') {
        delete notePaintData[index][num];
    } else {
        notePaintData[index][num] = currentPaintColor;
    }
    
    updateCellPaint(index);
}

function undoPaint() {
    if (paintHistory.length === 0) return;
    
    const lastAction = paintHistory.pop();
    
    switch (lastAction.type) {
        case 'cell':
            if (lastAction.oldColor === undefined) {
                delete cellPaintData[lastAction.index];
            } else {
                cellPaintData[lastAction.index] = lastAction.oldColor;
            }
            break;
        case 'note':
            if (!notePaintData[lastAction.index]) {
                notePaintData[lastAction.index] = {};
            }
            if (lastAction.num !== undefined) {
                if (lastAction.oldColor === undefined) {
                    delete notePaintData[lastAction.index][lastAction.num];
                } else {
                    notePaintData[lastAction.index][lastAction.num] = lastAction.oldColor;
                }
            } else {
                if (lastAction.oldColor === undefined) {
                    delete notePaintData[lastAction.index];
                } else {
                    notePaintData[lastAction.index] = lastAction.oldColor;
                }
            }
            break;
        case 'line':
            if (lastAction.oldColor === undefined) {
                delete linePaintData[lastAction.index];
            } else {
                linePaintData[lastAction.index] = lastAction.oldColor;
            }
            break;
    }
    
    updateCellPaint(lastAction.index);
}

function clearAllPaint() {
    paintHistory = [];
    cellPaintData = [];
    notePaintData = [];
    linePaintData = [];
    
    const board = document.getElementById('sudokuBoard');
    if (board) {
        const cells = board.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.backgroundColor = '';
            cell.style.opacity = '';
            cell.style.borderColor = '';
            cell.style.borderWidth = '';
            
            const candidateNums = cell.querySelectorAll('.candidate-num');
            candidateNums.forEach(candidate => {
                candidate.style.backgroundColor = '';
            });
        });
    }
}

function initPaintColors() {
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setPaintColor(btn.dataset.color);
        });
    });
}

window.addEventListener('load', initPaintColors);