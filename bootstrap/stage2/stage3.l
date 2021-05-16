%{
    import { GeneratorContext } from "../helpers/GeneratorContext";
    import { unEscape, addToRange } from "../helpers/CharacterHandlers";
    export var context = new GeneratorContext();
    var isCodeBlock = false;
    var codeBlockDepth = 1;
    var curStr = "";
    var range = "";
    var rangeRevert = false;
%}

%%

STAGE1END=>%%\r?\n lexer.setState("STAGE2");
STAGE1CODESTART=>%{\r?\n {
    lexer.pushState("STAGE1CODE");
}
NOOP=>\r?\n

>STAGE1CODE
STAGE1CODEEND=>%}\r?\n {
    lexer.popState();
}
STAGE1CODE=>.+|\r?\n {
    context.addPreambleCode(str);
}

>STAGE2
ID=>([a-zA-Z_0-9])+ {
    context.startRule(str);
    lexer.pushState("STAGE2SEPARATOR");
}
STATE=>\> lexer.setState("STAGE2STATENAME");
NOOP=>\r?\n

>STAGE2STATENAME
ID=>([a-zA-Z_0-9])+ {
    context.startState(str);
    lexer.setState("STAGE2");
}

>STAGE2SEPARATOR
SEPARATOR=>\=\> lexer.setState("STAGE2RULE");

>STAGE2RULE
NORMAL=>[^ \n\r\t\\.?()|*+=>["]+ context.addNormalChar(str);
SPECIAL=>[\\.?()|*+] context.specialChar(str);
SPACE=>(" "|\t)+{? {
    lexer.setState("STAGE2CODE");
    codeBlockDepth = 1;
    isCodeBlock = str.includes("{");
}
ESCAPE=>\\(n|r|t|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[|\") context.addEscapedChar(str);
RANGESTARTCHAR=>\[ {
    lexer.pushState("RANGESTART");
    range = "";
    rangeRevert = false;
}
LITTERAL=>\" {
    lexer.pushState("STRING");
    curStr = "";
}
NEWLINE=>\r?\n {
    context.endRule();
    lexer.popState();
}

>STRING
ESCAPE=>\\. curStr += str.slice(1);
END=>\" {
    context.addNormalChar(curStr);
    lexer.popState();
}
LITTERAL=>. curStr += str;

>STAGE2CODE
NEWLINE=>\r?\n {
    if (isCodeBlock) {
        context.addCode(str);
    } else {
        context.endRule();
        lexer.popState();
    }
}
CURLYOPEN=>{ {
    codeBlockDepth++;
    context.addCode(str);
}
CURLYCLOSE=>} {
    codeBlockDepth--;
    if (isCodeBlock && codeBlockDepth == 0) {
        context.endRule();
        lexer.popState();
    } else {
        context.addCode(str);
    }
}
STRING=>\"([^"]|\\\")*\" {
    context.addCode(str);
}
STRINGESCAPE=>\\\" {
    context.addCode(str);
}
CODE=>[^"{}\r\n]+ {
    context.addCode(str);
}

>RANGESTART
RANGEEXCLUDE=>^ {
    rangeRevert = true;
    lexer.setState("RANGEEXCLUDESTART");
}
RANGENORMAL=>. {
    range += str;
    lexer.setState("RANGE");
}
RANGEESCAPE=>\\(n|r|t|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[) {
    range += unEscape(str);
    lexer.setState("RANGE");
}
RANGERANGE=>.-. {
    range = addToRange(range, str[0], str[2]);
    lexer.setState("RANGE");
}

>RANGEEXCLUDESTART
RANGENORMAL=>. {
    range += str;
    lexer.setState("RANGE");
}
RANGEESCAPE=>\\(n|r|t|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[) {
    range += unEscape(str);
    lexer.setState("RANGE");
}
RANGERANGE=>.-. {
    range = addToRange(range, str[0], str[2]);
    lexer.setState("RANGE");
}

>RANGE
RANGEEND=>] {
    context.addRange(range, rangeRevert);
    lexer.popState();
}
RANGEESCAPE=>\\(n|r|t|\\|\.|\?|\(|\)|\||\*|\+|\=|\>|\[) {
    range += unEscape(str);
    lexer.setState("RANGE");
}
RANGERANGE=>.-. {
    range = addToRange(range, str[0], str[2]);
    lexer.setState("RANGE");
}
RANGENORMAL=>. {
    range += str;
    lexer.setState("RANGE");
}
