%{
%}

%%

STAGE1END=>%%\r?\n
STAGE1CODESTART=>%{\r?\n
NOOP=>\r?\n

>STAGE1CODE
STAGE1CODEEND=>%}\r?\n
STAGE1CODE=>.+|\r?\n

>STAGE2
ID=>(_|[0-9]|[A-Z]|[a-z]|^|-|]|%|{|})+
NEWLINE=>\r?\n
SEPARATOR=>\=\>
STATE=>\>
ESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[|\")
SPECIAL=>\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\"
RANGESTARTCHAR=>\[
LITTERAL=>\".+\"
CODESTART=>(" "|\t)+
ID2=>.

>STAGE2CODE
NEWLINE=>\r?\n
STAGE2CODE=>.+

>RANGESTART
RANGEEXCLUDE=>^
RANGEMINUS=>-
RANGENORMAL=>.
RANGEESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[)
RANGERANGE=>.-.

>RANGEEXCLUDESTART
RANGEMINUS=>-
RANGENORMAL=>.
RANGEESCAPE=>\\(n|r|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[)
RANGERANGE=>.-.

>RANGE
RANGEEND=>]
RANGERANGE=>.-.
RANGENORMAL=>.
