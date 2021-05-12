STAGE1END=>%%\r?\n
STAGE1CODESTART=>%{\r?\n
NOOP=>\r?\n

>STAGE1CODE
STAGE1CODEEND=>%}\r?\n
STAGE1CODE=>.+|\r?\n

>STAGE2
ID=>(_|0|1|2|3|4|5|6|7|8|9|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|^|-|])+
NEWLINE=>\r?\n
SEPARATOR=>\=\>
STATE=>\>
ESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|[)
SPECIAL=>\\|\.|\?|\(|\)|\||\*|\+|\=|\>
RANGESTARTCHAR=>[

>RANGESTART
RANGEEXCLUDE=>^
RANGEMINUS=>-
RANGENORMAL=>.
RANGEESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|[)
RANGERANGE=>.-.

>RANGEEXCLUDESTART
RANGEMINUS=>-
RANGENORMAL=>.
RANGEESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|[)
RANGERANGE=>.-.

>RANGE
RANGEEND=>]
RANGERANGE=>.-.
RANGENORMAL=>.
