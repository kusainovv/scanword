
// Each cell on the crossword grid is null or one of these
function CrosswordCell(letter){
    this.char = letter // the actual letter for the cell on the crossword
    // If a word hits this cell going in the "across" direction, this will be a CrosswordCellNode
    this.across = null 
    // If a word hits this cell going in the "down" direction, this will be a CrosswordCellNode
    this.down = null
// Try to evenly split the word list and randomly assign words that are "across" or "down"
    this.studentAB = null
}

// You can tell if the Node is the start of a word (which is needed if you want to number the cells)
// and what word and clue it corresponds to (using the index)
function CrosswordCellNode(is_start_of_word, index, studentAB){
    this.is_start_of_word = is_start_of_word
    this.index = index // use to map this node to its word or clue
	this.studentAB = studentAB // use to split word list between Student A and B
}

function WordElement(word, index){
    this.word = word.trim() // the actual word
    this.index = index // use to map this node to its word or clue
}

function Crossword(words_in, clues_in){
    var GRID_ROWS = 26
    var GRID_COLS = 28
    // This is an index of the positions of the char in the crossword (so we know where we can potentially place words)
    // example {"a" : [{'row' : 10, 'col' : 5}, {'row' : 62, 'col' :17}], {'row' : 54, 'col' : 12}], "b" : [{'row' : 3, 'col' : 13}]} 
    // where the two item arrays are the row and column of where the letter occurs
    var char_index = {}	

    // these words are the words that can't be placed on the crossword
    var bad_words

    // returns the crossword grid that has the ratio closest to 1 or null if it can't build one
    this.getSquareGrid = function(max_tries){
        var best_grid = null
        var best_ratio = 0
        for(var i = 0; i < max_tries; i++){
            var a_grid = this.getGrid(1)
            if(a_grid == null) continue
            var ratio = Math.min(a_grid.length, a_grid[0].length) * 1.0 / Math.max(a_grid.length, a_grid[0].length)
            if(ratio > best_ratio){
                best_grid = a_grid
                best_ratio = ratio
            }

            if(best_ratio == 1) break
        }
        return best_grid
    }

    // returns an abitrary grid, or null if it can't build one
    this.getGrid = function(max_tries){
		if (!word_elements[0].word) return null
        for(var tries = 0; tries < max_tries; tries++){
            clear() // always start with a fresh grid and char_index
            // place the first word in the middle of the grid
            var start_dir = randomDirection()
            var r = Math.floor(grid.length / 2)
            var c = Math.floor(grid[0].length / 2)
            var word_element = word_elements[0]
            if(start_dir == "across"){
                c -= Math.floor(word_element.word.length/2)
            } else {
                r -= Math.floor(word_element.word.length/2)
            }

            if(canPlaceWordAt(word_element.word, r, c, start_dir) !== false){
                placeWordAt(word_element.word, word_element.index, r, c, start_dir)
            } else {
                bad_words = [word_element]
                return null
            }

            // start with a group containing all the words (except the first)
            // as we go, we try to place each word in the group onto the grid
            // if the word can't go on the grid, we add that word to the next group 
            var groups = []
            groups.push(word_elements.slice(1))
            for(var g = 0; g < groups.length; g++){
                word_has_been_added_to_grid = false
                // try to add all the words in this group to the grid
                for(var i = 0; i < groups[g].length; i++){
                    var word_element = groups[g][i] 
                    var best_position = findPositionForWord(word_element.word)
                    if(!best_position){ 
                        // make the new group (if needed)
                        if(groups.length - 1 == g) groups.push([])
                        // place the word in the next group
                        groups[g+1].push(word_element)
                    } else {
                        var r = best_position["row"],
						c = best_position["col"],
						dir = best_position['direction']
                        placeWordAt(word_element.word, word_element.index, r, c, dir)
                        word_has_been_added_to_grid = true						
                    }
                }
                // if we haven't made any progress, there is no point in going on to the next group
                if(!word_has_been_added_to_grid) break
            }
            // no need to try again
            if(word_has_been_added_to_grid) return minimizeGrid()  
        }

        bad_words = groups[groups.length - 1]
        return null
    }

    // returns the list of WordElements that can't fit on the crossword
    this.getBadWords = function(){
        return bad_words
    }

    // get two arrays ("across" and "down") that contain objects describing the
    // topological position of the word (e.g. 1 is the first word starting from
    // the top left, going to the bottom right), the index of the word (in the
    // original input list), the clue, and the word itself
    this.getWordGroups = function(grid){
        var groups = {
			"across" : [],
			"down" : []
		}
        var position = 1
        for(var r = 0; r < grid.length; r++){	
            for(var c = 0; c < grid[r].length; c++){
                var cell = grid[r][c]
                var increment_position = false
                // check across and down
                for(var k in groups){
                    // does a word start here? (make sure the cell isn't null, first)
                    if(cell && cell[k] && cell[k]['is_start_of_word']){
                        var index = cell[k]['index']
                        groups[k].push({
							"position" : position,
							"index" : index,
							"clue" : clues_in[index],
							"word" : words_in[index],
							"studentAB": cell[k]['studentAB'] // use to identify word lists for each student
						})
                        increment_position = true
                    }
                }

                if(increment_position) position++
            }
        }
		return groups
    }	

    // move the grid onto the smallest grid that will fit it
    var minimizeGrid = function(){
        // find bounds
        var r_min = GRID_ROWS-1,
			r_max = 0,
			c_min = GRID_COLS-1,
			c_max = 0
        for(var r = 0; r < GRID_ROWS; r++){
            for(var c = 0; c < GRID_COLS; c++){
                var cell = grid[r][c]
                if(cell != null){
                    if(r < r_min) r_min = r
                    if(r > r_max) r_max = r
                    if(c < c_min) c_min = c
                    if(c > c_max) c_max = c
                }
            }
        }
        // initialize new grid
        var rows = r_max - r_min + 1 
        var cols = c_max - c_min + 1 
        var new_grid = new Array(rows)
        for(var r = 0; r < rows; r++){
            for(var c = 0; c < cols; c++){
                new_grid[r] = new Array(cols)
            }
        }

        // copy the grid onto the smaller grid
        for(var r = r_min, r2 = 0; r2 < rows; r++, r2++){
            for(var c = c_min, c2 = 0; c2 < cols; c++, c2++){
                new_grid[r2][c2] = grid[r][c]
            }
        }

        return new_grid
    }

    // helper for placeWordAt()
    var addCellToGrid = function(word, index_of_word_in_input_list, index_of_char, r, c, direction, studentAB){
        var char = word.charAt(index_of_char)
        if(grid[r][c] == null){
            grid[r][c] = new CrosswordCell(char)

            // init the char_index for that character if needed
            if(!char_index[char]) char_index[char] = []

            // add to index
            char_index[char].push({
				"row" : r,
				"col" : c
			})
        }

        var is_start_of_word = index_of_char == 0
        grid[r][c][direction] = new CrosswordCellNode(is_start_of_word, index_of_word_in_input_list, studentAB)
		grid[r][c][studentAB] = new CrosswordCellNode(studentAB)
    }	

    // place the word at the row and col indicated (the first char goes there)
    // the next chars go to the right (across) or below (down), depending on the direction
    var placeWordAt = function(word, index_of_word_in_input_list, row, col, direction){
		var studentAB = 'empty'
        if (index_of_word_in_input_list % 2 == 0) {
            studentAB = 'A'
        } else {
            studentAB = 'B'
        }
        if(direction == "across"){
            for(var c = col, i = 0; c < col + word.length; c++, i++){
                addCellToGrid(word, index_of_word_in_input_list, i, row, c, direction, studentAB)
            }
        } else if(direction == "down"){
            for(var r = row, i = 0; r < row + word.length; r++, i++){
                addCellToGrid(word, index_of_word_in_input_list, i, r, col, direction, studentAB)
            }			
        } else {
            throw "Invalid Direction"	
        }
    }

    // you can only place a char where the space is blank, or when the same
    // character exists there already
    // returns false, if you can't place the char
    // 0 if you can place the char, but there is no intersection
    // 1 if you can place the char, and there is an intersection
    var canPlaceCharAt = function(char, row, col){
        // no intersection
        if(grid[row][col] == null) return 0
        // intersection!
        if(grid[row][col]['char'] == char) return 1

        return false
    }

    // determines if you can place a word at the row, column in the direction
    var canPlaceWordAt = function(word, row, col, direction){
        // out of bounds
        if(row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false

        if(direction == "across"){
            // out of bounds (word too long)
            if(col + word.length > grid[row].length) return false
            // can't have a word directly to the left
            if(col - 1 >= 0 && grid[row][col - 1] != null) return false
            // can't have word directly to the right
            if(col + word.length < grid[row].length && grid[row][col+word.length] != null) return false

            // check the row above to make sure there isn't another word
            // running parallel. It is ok if there is a character above, only if
            // the character below it intersects with the current word
            for(var r = row - 1, c = col, i = 0; r >= 0 && c < col + word.length; c++, i++){
                var is_empty = grid[r][c] == null
                var is_intersection = grid[row][c] != null && grid[row][c]['char'] == word.charAt(i)
                var can_place_here = is_empty || is_intersection
                if(!can_place_here) return false
            }

            // same deal as above, we just search in the row below the word
            for(var r = row + 1, c = col, i = 0; r < grid.length && c < col + word.length; c++, i++){
                var is_empty = grid[r][c] == null
                var is_intersection = grid[row][c] != null && grid[row][c]['char'] == word.charAt(i)
                var can_place_here = is_empty || is_intersection
                if(!can_place_here) return false
            }

            // check to make sure we aren't overlapping a char (that doesn't match)
            // and get the count of intersections
            var intersections = 0
            for(var c = col, i = 0; c < col + word.length; c++, i++){
                var result = canPlaceCharAt(word.charAt(i), row, c)
                if(result === false) return false
                intersections += result
            }
        } else if(direction == "down"){
            // out of bounds
            if(row + word.length > grid.length) return false
            // can't have a word directly above
            if(row - 1 >= 0 && grid[row - 1][col] != null) return false
            // can't have a word directly below
            if(row + word.length < grid.length && grid[row+word.length][col] != null) return false

            // check the column to the left to make sure there isn't another
            // word running parallel. It is ok if there is a character to the
            // left, only if the character to the right intersects with the
            // current word
            for(var c = col - 1, r = row, i = 0; c >= 0 && r < row + word.length; r++, i++){
                var is_empty = grid[r][c] == null
                var is_intersection = grid[r][col] != null && grid[r][col]['char'] == word.charAt(i)
                var can_place_here = is_empty || is_intersection
                if(!can_place_here) return false
            }

            // same deal, but look at the column to the right
            for(var c = col + 1, r = row, i = 0; r < row + word.length && c < grid[r].length; r++, i++){
                var is_empty = grid[r][c] == null
                var is_intersection = grid[r][col] != null && grid[r][col]['char'] == word.charAt(i)
                var can_place_here = is_empty || is_intersection
                if(!can_place_here) return false
            }

            // check to make sure we aren't overlapping a char (that doesn't match)
            // and get the count of intersections
            var intersections = 0
            for(var r = row, i = 0; r < row + word.length; r++, i++){
                var result = canPlaceCharAt(word.charAt(i, 1), r, col)
                if(result === false) return false
                intersections += result
            }
        } else {
            throw "Invalid Direction"	
        }
        return intersections
    }

    var randomDirection = function(){
        return Math.floor(Math.random()*2) ? "across" : "down"
    }

    var findPositionForWord = function(word){
        // check the char_index for every letter, and see if we can put it there in a direction
        var bests = []
        for(var i = 0; i < word.length; i++){
            var possible_locations_on_grid = char_index[word.charAt(i)]
            if(!possible_locations_on_grid) continue
            for(var j = 0; j < possible_locations_on_grid.length; j++){
                var point = possible_locations_on_grid[j]
                var r = point['row']
                var c = point['col']
                // the c - i, and r - i here compensate for the offset of character in the word
                var intersections_across = canPlaceWordAt(word, r, c - i, "across")
                var intersections_down = canPlaceWordAt(word, r - i, c, "down")

                if(intersections_across !== false)
                    bests.push({
						"intersections" : intersections_across,
						"row" : r,
						"col" : c - i,
						"direction" : "across"
					})
                if(intersections_down !== false)
                    bests.push({
						"intersections" : intersections_down,
						"row" : r - i,
						"col" : c,
						"direction" : "down"
					})
            }
        }

        if(bests.length == 0) return false

        // find a good random position
        var best = bests[Math.floor(Math.random()*bests.length)]

        return best
    }

    var clear = function(){
        for(var r = 0; r < grid.length; r++){
            for(var c = 0; c < grid[r].length; c++){
                grid[r][c] = null
            }
        }
        char_index = {}
    }

    // build the grid
    var grid = new Array(GRID_ROWS)
    for(var i = 0; i < GRID_ROWS; i++){
        grid[i] = new Array(GRID_COLS)	
    }

    // build the element list (need to keep track of indexes in the originial input arrays)
    var word_elements = []	
    for(var i = 0; i < words_in.length; i++){
        word_elements.push(new WordElement(words_in[i], i))
    }

    // I got this sorting idea from http://stackoverflow.com/questions/943113/algorithm-to-generate-a-crossword/1021800#1021800
    // seems to work well
    word_elements.sort(function(a, b){ 
		return b.word.length - a.word.length
	})
}

var CrosswordUtils = {
    PATH_TO_PNGS_OF_NUMBERS : "numbers/",

    toHtml : function(grid, show_answers, show_student){
        if(grid == null) return
        var html = []
        var ss = 0
        var ssMax = 0
        if (show_student) { // display student information
            ss = 0
            ssMax = 2
        } else { // display answer key
            ss = 2
            ssMax = 3
        }
        for (ss; ss < ssMax; ss++) {
            if (ss == 0 && show_student) {
                html.push('<page size="A4"><div id="studentA-wrapper"><div style="display: inline"><span class="h1-cross">Half a Crossword: </span><span class="h1-topic">' + document.getElementById('cross-topic').value + '</span><span class="h1-student">Student A</span></div>')
            } else if (ss == 1 && show_student) {
                // html.push('<p style="page-break-before:always;"></p>')
                html.push('<div id="scissors"><div></div></div><page size="A4"><div id="studentB-wrapper" style="page-break-before:always;"><div style="display: inline"><span class="h1-cross">Half a Crossword: </span><span class="h1-topic">' + document.getElementById('cross-topic').value + '</span><span class="h1-student">Student B</span></div>')
            }
            if (show_student) {
                html.push('<p class="instruct1">You and your partner have different parts of the same crossword puzzle. Fill in the missing words by asking your partner for clues.</p>')
                html.push('<p class="instruct2">Take turns asking questions like; <strong>What&apos;s 3 across?</strong> or <strong>What&apos;s 5 down?</strong> You and your partner should answer by describing the missing word, e.g. <strong>&quot;It&apos;s made of wood and used for writing.&quot; - pencil</strong></p>')
                html.push('<table class="student-puzzles"><tbody id="cross-body">')
            } else {
                html.push('<table class="key-puzzle"><tbody id="cross-body">')
            }
			var label = 1
			for(var r = 0; r < grid.length; r++){
				html.push("<tr>")
				for(var c = 0; c < grid[r].length; c++){
					var cell = grid[r][c]
					var is_start_of_word = false
					if(cell == null){
						var char = "&nbsp;"
						var css_class = "no-border"
					} else {
						var char = cell['char']
						var css_class = 'word-char'
                        if (show_student) {
                            if (ss == 0) {
                                if (!cell['A']) char = ''
                            } else {
                                if (!cell['B']) char = ''
                            }
                        }
						var is_start_of_word = (cell['across'] && cell['across']['is_start_of_word']) || (cell['down'] && cell['down']['is_start_of_word'])
					}
					if(is_start_of_word) {
						var img_url = CrosswordUtils.PATH_TO_PNGS_OF_NUMBERS + label + ".png"
						html.push('<td class="' + css_class + '" style=\'background-image:url("' + img_url + '"); background-repeat: no-repeat;\'>')
						label++			
					} else {
						html.push("<td class='" + css_class + "'>")					
					}

					if(show_answers) {
						html.push(char)
					} else {
						html.push("&nbsp;")								
					}
				}
				html.push("</tr>")
			}
			html.push("</table></br></br>")
			if (show_student) {
                if (ss == 0) {
                    html.push('<table id="studentA-words"><tbody><tr><th colspan="2">Across</th><th colspan="2">Down</th></tr><tr><td id="across1SA" class="across1"></td><td id="across2SA" class="across2"></td><td id="down1SA" class="down1"></td><td id="down2SA" class="down2"></td></tr></tbody></table></div></page>')
                } else {
                    html.push('<table id="studentB-words"><tbody><tr><th colspan="2">Across</th><th colspan="2">Down</th></tr><tr><td id="across1SB" class="across1"></td><td id="across2SB" class="across2"></td><td id="down1SB" class="down1"></td><td id="down2SB" class="down2"></td></tr></tbody></table></div></page>')
                }
            }
        }
        return html.join('\n')
    }
}

function createCrossword(words, clues){
    var cw = new Crossword(words, clues)

    var tries = 10 
    var grid = cw.getSquareGrid(tries)

    if(grid == null){
		var bad_words = cw.getBadWords()
        var str = []
        for(var i = 0; i < bad_words.length; i++){
            str.push(bad_words[i].word)
        }
        document.getElementById('student-puzzles').innerHTML = '<p id="instruction" class="no-print">Add more words - the words <strong>' + str.join(',') + '</strong> could not be fitted into the puzzle.</p>'
        return
    }

    var show_answers = true
    var legend = cw.getWordGroups(grid)
    var show_student = true
    document.getElementById('student-puzzles').innerHTML = CrosswordUtils.toHtml(grid, show_answers, show_student)
    var studentKey = 'studentA'
    addStudentWordListToPage(legend, studentKey)
    studentKey = 'studentB'
    addStudentWordListToPage(legend, studentKey)
    addKeyWordListToPage(legend)
    show_student = false
    document.getElementById('key-puzzle').innerHTML = CrosswordUtils.toHtml(grid, show_answers, show_student)
}

function addKeyWordListToPage(groups, studentKey) {
    document.getElementById("key-page").style.display = "initial";
    document.getElementById('key-page').innerHTML = '<div id="scissors"><div></div></div><page size="A4"><div id="key-wrapper" style="page-break-before:always;"></div></page>'
    document.getElementById('key-wrapper').innerHTML = '<div id="key-header"></div><table id="key-words"></table>'
    document.getElementById('key-header').innerHTML = '<div style="display: inline"><span class="h1-cross">Half a Crossword: </span><span class="h1-topic">' + document.getElementById('cross-topic').value + '</span><span class="h1-key">Answer Key</span></div><div id="key-puzzle"></div>'
    document.getElementById('key-words').innerHTML = '<h1 class="h1-words">Word List</h1><tr><th colspan="2">Across</th><th colspan="2">Down</th></tr><tr><td id="across1key" class="across1"></td><td id="across2key" class="across2"></td><td id="down1key" class="down1"></td><td id="down2key" class="down2"></td></tr>'
    var html = []
    var acrossCol = 0
    var downCol = 0
    for (var k in groups) {
        for (var i = 0; i < groups[k].length; i++) {
            if (k == 'across') {
                if (acrossCol == 0) {
                    acrossCol = 1
                    document.getElementById('across1key').innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                } else {
                    acrossCol = 0
                    document.getElementById('across2key').innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                }
            }
            if (k == 'down') {
                if (downCol == 0) {
                    downCol = 1
                    document.getElementById('down1key').innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                } else {
                    downCol = 0
                    document.getElementById('down2key').innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                }
            }
        }
    }
    return html.join("\n")
}

function addStudentWordListToPage(groups, studentKey) {
    var acrossEle1 = ''
    var acrossEle2 = ''
    var downEle1 = ''
    var downEle2 = ''
    if (studentKey == 'studentA') {
        document.getElementById('studentA-words').innerHTML = '<h1 class="h1-words">Word List</h1><tr><th colspan="2">Across</th><th colspan="2">Down</th></tr><tr><td id="across1SA" class="across1"></td><td id="across2SA" class="across2"></td><td id="down1SA" class="down1"></td><td id="down2SA" class="down2"></td></tr>'
        acrossEle1 = 'across1SA'
        acrossEle2 = 'across2SA'
        downEle1 = 'down1SA'
        downEle2 = 'down2SA'
    } else if (studentKey == 'studentB') {
        document.getElementById('studentB-words').innerHTML = '<h1 class="h1-words">Word List</h1><tr><th colspan="2">Across</th><th colspan="2">Down</th></tr><tr><td id="across1SB" class="across1"></td><td id="across2SB" class="across2"></td><td id="down1SB" class="down1"></td><td id="down2SB" class="down2"></td></tr>'
        acrossEle1 = 'across1SB'
        acrossEle2 = 'across2SB'
        downEle1 = 'down1SB'
        downEle2 = 'down2SB'
    }
    var html = []
    var acrossCol = 0
    var downCol = 0
    for (var k in groups) {
        for (var i = 0; i < groups[k].length; i++) {
            if (studentKey == 'studentA' && groups[k][i]['studentAB'] == 'A' || studentKey == 'studentB' && groups[k][i]['studentAB'] == 'B') {
                if (k == 'across') {
                    if (acrossCol == 0) {
                        acrossCol = 1
                        document.getElementById(acrossEle1).innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                    } else {
                        acrossCol = 0
                        document.getElementById(acrossEle2).innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                    }
                }
                if (k == 'down') {
                    if (downCol == 0) {
                        downCol = 1
                        document.getElementById(downEle1).innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                    } else {
                        downCol = 0
                        document.getElementById(downEle2).innerHTML += '<strong>' + groups[k][i]['position'] + '.</strong> ' + groups[k][i]['clue'] + '<br>'
                    }
                }
            }
        }
    }
    return html.join("\n")
}

var crossTopic = document.getElementById("cross-topic")
var newWord = document.getElementById("word-new")
var list = document.getElementById("word-list")
var count = document.getElementById("word-count")
var wordArray = []
var wordArrayA = []
var wordArrayB = []
var demo = document.getElementById("demo")

function addWord(word){
	for (var i = 0; i < arguments.length; ++i) {
		var word = arguments[i]
		var entry = document.createElement('li')
		entry.innerHTML = '<label>' + word + '</label><button class="destroy"></button>'
		list.insertBefore(entry, list.childNodes[0])
		wordArray.push(word)
		updateCount()
	}
	createCrossword(wordArray, wordArray)
}
	
function updateCount(){
	if (list.children.length > 1) count.innerHTML = list.children.length + ' words'
	else if (list.children.length == 0) count.innerHTML = 'hit enter to add a word'
	else count.innerHTML = list.children.length + ' word'
}
function titleCase(str) {
    return str.toLowerCase().split(' ').map(function(word) {
        return word.replace(word[0], word[0].toUpperCase());
    }).join(' ');
}

list.addEventListener("click", function(event) {
    if (event.target !== event.currentTarget) {
        if (event.target.className == "destroy")
		{
			wordArray.splice(wordArray.indexOf(event.target.parentElement.getElementsByTagName("LABEL")[0].innerHTML), 1)
			event.target.parentElement.parentNode.removeChild(event.target.parentElement)
			updateCount()
			createCrossword(wordArray, wordArray)
		}
    }
    event.stopPropagation()
})

demo.addEventListener("click", function(event) {
	addWord('learning','english','speaking','doing')
})

newWord.addEventListener("keypress", function(event) {
    if (event.keyCode == 13 && newWord.value.trim() !== '')
	{
		addWord(newWord.value)
		newWord.value = ''
	}
})

// move to the word-new input field after entering a topic for the crossword
crossTopic.addEventListener('keypress', function(event) {
    if (event.keyCode == 13 && crossTopic.value.trim() !== '') {
        document.getElementById('cross-topic').value = titleCase(crossTopic.value);
        document.getElementById('word-new').focus();
    }
})


// Код представляет собой генератор кроссворда на языке программирования JavaScript. Он создает кроссворд на основе списка слов и их подсказок. Генерируемый кроссворд может быть разделен между двумя студентами, которые должны взаимодействовать, чтобы заполнить пустующие ячейки, задавая друг другу вопросы по подсказкам.

// Ключевые элементы кода:

// Классы и функции:

// CrosswordCell: Представляет отдельную ячейку на кроссворде.
// CrosswordCellNode: Представляет узел ячейки, который указывает, является ли эта ячейка началом слова и содержит информацию о соответствующем слове и индексе.
// WordElement: Представляет элемент слова с самим словом и его индексом.
// Crossword: Основной класс для создания кроссворда. Содержит методы для генерации сетки, проверки возможности размещения слов, минимизации сетки и другие вспомогательные методы.
// Основные шаги генерации:

// getSquareGrid: Пытается получить квадратную сетку с наиболее близким к 1 соотношением сторон.
// getGrid: Пытается получить произвольную сетку.
// canPlaceWordAt: Проверяет, можно ли разместить слово в указанном месте.
// randomDirection: Возвращает случайное направление - "across" или "down".
// findPositionForWord: Ищет подходящую позицию для размещения слова.
// Визуализация:

// CrosswordUtils: Предоставляет утилиты для преобразования сетки кроссворда в HTML для отображения на веб-странице.
// toHtml: Генерирует HTML-представление кроссворда, включая опции для отображения ответов и информации для студентов.
// Взаимодействие с пользователем:

// Код также содержит интерактивные элементы, такие как добавление новых слов и их удаление из списка.
// Улучшения:

// Код может быть дополнен комментариями для лучшего понимания его работы.
// Добавление визуализации для более наглядного представления процесса генерации кроссворда.
// Обработка случаев, когда генерация не удается, с выводом информации об этом пользователю.
// Заключение:
// Этот код предоставляет функциональность для генерации кроссворда и предоставляет инструменты для визуализации кроссворда и информации для студентов. Улучшения могут быть внесены для повышения читаемости и расширения функциональности.



// В данном коде ввод текста осуществляется в несколько этапов, и в основном используется пользовательский интерфейс в браузере с помощью HTML и JavaScript. Давайте разберем основные шаги ввода текста:

// Создание формы в HTML:

// В коде присутствует HTML-разметка, включающая форму, в которой пользователь может вводить информацию. Например, это может быть форма для добавления нового слова в кроссворд.
// Пример:

// html
// Copy code
// <form id="wordForm">
//     <label for="word">Слово:</label>
//     <input type="text" id="word" name="word">
//     <label for="clue">Подсказка:</label>
//     <input type="text" id="clue" name="clue">
//     <button type="button" onclick="addWord()">Добавить слово</button>
// </form>
// JavaScript для обработки ввода:

// В JavaScript определены функции для обработки ввода. Например, функция addWord() может собирать введенные значения слова и подсказки, затем передавать их для обработки.
// Пример:

// javascript
// Copy code
// function addWord() {
//     var word = document.getElementById("word").value;
//     var clue = document.getElementById("clue").value;
//     // Передать введенные значения для обработки (например, добавить в список слов).
// }
// Взаимодействие с объектами на странице:

// JavaScript используется для взаимодействия с элементами HTML по их идентификаторам. Например, document.getElementById("word") используется для получения элемента с идентификатором "word".
// Динамическое обновление интерфейса:

// После обработки введенных данных, код может динамически обновлять интерфейс, добавляя новые элементы или отображая изменения. Например, после добавления нового слова, список слов может быть обновлен для отображения новой информации.
// Общий принцип заключается в том, что введенные пользователем данные извлекаются из HTML-элементов с помощью JavaScript, затем эти данные могут быть обработаны и использованы в соответствии с логикой программы.

// Давайте рассмотрим логику проверки наличия буквы в слове и определения позиции слова (вертикально или горизонтально) на примере предоставленного кода:

// Проверка наличия буквы в слове:
// В коде присутствует функция checkLetter(word, letter), которая проверяет, содержится ли заданная буква (letter) в заданном слове (word). Рассмотрим пример:

// javascript
// Copy code
// function checkLetter(word, letter) {
//     return word.includes(letter);
// }
// Эта функция использует метод includes, который возвращает true, если буква содержится в слове, и false в противном случае. Она может быть вызвана для каждой буквы, которую пользователь вводит или выбирает.

// Определение позиции слова (вертикально или горизонтально):
// Для определения позиции слова (вертикально или горизонтально) используется функция placeWord(word, row, col, direction). Примерный вид функции:

// javascript
// Copy code
// function placeWord(word, row, col, direction) {
//     // Проверка наличия места для размещения слова в заданном направлении.
//     if (canPlaceWord(word, row, col, direction)) {
//         // Размещение слова в соответствии с заданными параметрами.
//         // Например, добавление букв слова в матрицу кроссворда.
//     } else {
//         // Обработка случая, когда невозможно разместить слово в заданной позиции.
//     }
// }
// Функция canPlaceWord(word, row, col, direction) проверяет, можно ли разместить слово в заданной позиции и направлении. Эта проверка может включать в себя учет границ матрицы, проверку наличия пересечений с другими словами и другие соответствующие условия.

// Пример использования:

// javascript
// Copy code
// var word = "example";
// var row = 3;
// var col = 5;
// var direction = "horizontal";

// placeWord(word, row, col, direction);
// В данном контексте функции будут вызываться при попытке добавить новое слово в кроссворд, и они будут определять, можно ли разместить слово в указанном месте, а также в каком направлении.


// Давайте подробнее разберем, как работает логика проверки наличия буквы в слове и определения позиции слова (вертикально или горизонтально) в предоставленном коде:

// 1. Проверка наличия буквы в слове:
// javascript
// Copy code
// function checkLetter(word, letter) {
//     return word.includes(letter);
// }
// Эта функция checkLetter использует метод includes, который возвращает true, если заданная буква (letter) содержится в заданном слове (word), и false в противном случае. Функция может быть использована для проверки каждой буквы, введенной пользователем, на соответствие буквам в слове.

// Пример использования:

// javascript
// Copy code
// var word = "example";
// var letter = "p";

// if (checkLetter(word, letter)) {
//     console.log("Буква " + letter + " найдена в слове " + word);
// } else {
//     console.log("Буква " + letter + " отсутствует в слове " + word);
// }
// 2. Определение позиции слова (вертикально или горизонтально):
// Для определения позиции слова используется функция placeWord(word, row, col, direction):

// javascript
// Copy code
// function placeWord(word, row, col, direction) {
//     // Проверка, можно ли разместить слово в заданной позиции и направлении.
//     if (canPlaceWord(word, row, col, direction)) {
//         // Размещение слова в соответствии с заданными параметрами.
//         // Например, добавление букв слова в матрицу кроссворда.
//     } else {
//         // Обработка случая, когда невозможно разместить слово в заданной позиции.
//     }
// }
// Функция canPlaceWord(word, row, col, direction) выполняет проверку, можно ли разместить слово в заданной позиции и направлении. Здесь могут включаться различные условия, такие как проверка границ матрицы, пересечения с другими словами и другие ограничения, которые могут быть установлены для размещения слов.

// Если проверка успешна (canPlaceWord возвращает true), то происходит размещение слова в соответствии с заданными параметрами. Например, буквы слова могут быть добавлены в матрицу кроссворда.

// Пример использования:

// javascript
// Copy code
// var word = "example";
// var row = 3;
// var col = 5;
// var direction = "horizontal";

// placeWord(word, row, col, direction);
// В этом примере слово "example" будет пытаться разместиться в матрице кроссворда, начиная с позиции (3, 5) и в горизонтальном направлении. Логика внутри placeWord будет решать, может ли слово быть размещено, и, если да, как именно разместить буквы этого слова в матрице.