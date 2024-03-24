//@ts-check
import * as eskv from '../eskv/lib/eskv.js';
import { parse } from '../eskv/lib/modules/markup.js';

//The markup specifies styles for the button and display and the overall UI layout in the App
const markup = `
<AnswerButton>:
    bgColor: 'rgba(128,128,100,1)'
    selectColor: 'orange'
    sizeGroup: 'buttonText'
    radius: 0.3


BoxLayout:
    hints: {h:1, w:1}
    orientation: 'vertical'
    spacingY: '0.1h'
    Label:
        id: 'question'
        hints: {h:0.3}
    Result:
        hints: {h:0.2}
        id: 'result'
        state: 'unanswered'
    BoxLayout:
        orientation: 'horizontal'
        hints: {h:0.2}
        id: 'answerOptions'
        AnswerButton:
            id: 'answer1'
        AnswerButton:
            id: 'answer2'
        AnswerButton:
            id: 'answer3'
        AnswerButton:
            id: 'answer4'
`


//Code for a rounded rect
function roundedRectPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

//Create buttons and a "display" that extend Button and Label widgets to
//override the draw methods to clip the drawn region to rounded rects
//Property styling is deferred to the markup
class AnswerButton extends eskv.Button {
    radius = 0;
    draw(app, ctx) {
        roundedRectPath(ctx, this.x, this.y, this.w, this.h, this.radius*Math.min(this.w,this.h));
        ctx.save();
        ctx.clip();
        super.draw(app, ctx);
        ctx.restore();
    }
    on_press(e, o, v) {
        const result = /**@type {Result} */(window.app.findById('result'));
        if(Alphabetical.get().currentQuestion===10) {
            Alphabetical.get().setupGame();
        } else if(result.state==='unanswered') {
            Alphabetical.get().processAnswer(this.text);
        } 
    }
}

class Result extends eskv.Label {
    radius = 0;
    /**@type {'unanswered'|'correct'|'incorrect'} */
    state = 'unanswered'
    /**@type {eskv.Widget['draw']} */
    draw(app, ctx) {
        if(this.state==='correct') {
            const lw = ctx.lineWidth;
            const ss = ctx.strokeStyle;
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'green';
            ctx.beginPath();
            ctx.moveTo(this.center_x-this.h/2, this.center_y+this.h/4);
            ctx.lineTo(this.center_x-this.h/4, this.center_y+this.h/2);
            ctx.lineTo(this.center_x+this.h/2, this.center_y-this.h/2);
            ctx.stroke();
            ctx.lineWidth = lw;
            ctx.strokeStyle = ss;
        }
        if(this.state==='incorrect') {
            const lw = ctx.lineWidth;
            const ss = ctx.strokeStyle;
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(this.center_x-this.h/2, this.center_y-this.h/2);
            ctx.lineTo(this.center_x+this.h/2, this.center_y+this.h/2);
            ctx.moveTo(this.center_x-this.h/2, this.center_y+this.h/2);
            ctx.lineTo(this.center_x+this.h/2, this.center_y-this.h/2);
            ctx.stroke();
            ctx.lineWidth = lw;
            ctx.strokeStyle = ss;

        }
    }
}

//For now you have to register all classes that you access in markup
eskv.App.registerClass('AnswerButton', AnswerButton, 'Button');
eskv.App.registerClass('Result', Result, 'Widget');

class Alphabetical extends eskv.App {
    prefDimW = -1;
    prefDimH = -1;
    tileSize = 1;
    questions = ['a b c _', 'b c d _'];
    answers = ['d', 'e'];
    correctAnswers = 0;
    currentQuestion = -1;
    alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m',
                'n','o','p','q','r','s','t','u','v','w','x','y','z'];
    startTime = 0;
    constructor(props={}) {
        super();
        this.baseWidget.addChild(parse(markup)[0]);
        this.setupGame();
        if(props) this.updateProperties(props);
    }        
    setupGame() {
        const alphabet = this.alphabet;
        const answers = eskv.rand.shuffle(alphabet.slice()).slice(0,10).map((v)=>eskv.rand.random()<0.5?v:v.toUpperCase());
        const questions = [];
        let n = 1;
        for(let a of answers) {
            const pos = alphabet.indexOf(a.toLowerCase());
            let question;
            if (pos<1) {
                question = '_ '+alphabet[pos+1]+' '+alphabet[pos+2];
            } else if (pos>24) {
                question = alphabet[pos-2]+' '+alphabet[pos-1]+' _';
            }
            else {
                const pick = eskv.rand.random();
                if(pick<0.33 && pos<24) {
                    question = '_ '+alphabet[pos+1]+' '+alphabet[pos+2];
                } else if (pick<0.66 && pos>1) {
                    question = alphabet[pos-2]+' '+alphabet[pos-1]+' _';
                } else {
                    question = this.alphabet[pos-1]+' _ '+alphabet[pos+1];
                }
            } 
            questions.push(`#${n}: `+(a===a.toUpperCase()?question.toUpperCase():question));
            n++;
        }
        this.answers = answers;
        this.questions = questions;
        this.currentQuestion = -1;
        this.correctAnswers = 0;
        this.startTime = Date.now();
        this.next();
    }
    next() {
        if(this.currentQuestion<this.answers.length-1) {
            this.currentQuestion++;
            const currentQuestion = this.currentQuestion;
            window.app.findById('question').text = this.questions[currentQuestion];
            const currentAnswer = this.answers[currentQuestion];
            const pos = this.alphabet.indexOf(currentAnswer.toLowerCase());
            const otherAnswers = this.alphabet.slice()
            otherAnswers.splice(pos, 1);
            const answers = eskv.rand.shuffle(otherAnswers).slice(0,3).map((v)=>currentAnswer===currentAnswer.toUpperCase()?v.toUpperCase():v);;
            answers.push(currentAnswer);
            eskv.rand.shuffle(answers)
            console.log(answers);
            window.app.findById('answer1').text = answers[0];
            window.app.findById('answer2').text = answers[1];
            window.app.findById('answer3').text = answers[2];
            window.app.findById('answer4').text = answers[3];
            window.app.findById('answer1').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer2').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer3').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer4').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('result').state = 'unanswered';
        } else {
            this.currentQuestion++;
            const time = Date.now() - this.startTime - 30000;
            const displayTime = Math.floor(time*10/1000)/10;
            window.app.findById('question').text = `Score: ${this.correctAnswers}/10, Time: ${displayTime}s`;
            window.app.findById('answer1').text = '*';
            window.app.findById('answer2').text = '*';
            window.app.findById('answer3').text = '*';
            window.app.findById('answer4').text = '*';
            window.app.findById('answer1').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer2').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer3').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('answer4').bgColor = 'rgba(128,128,100,1)';
            window.app.findById('result').state = 'unanswered';
            const gameCount = JSON.parse(window.localStorage.getItem('Alphabetical/alphabet/gameCount')??'0');
            window.localStorage.setItem('Alphabetical/alphabet/gameCount', JSON.stringify(gameCount+1));
            window.localStorage.setItem(`Alphabetical/alphabet/game${gameCount}`, 
                JSON.stringify({
                    score: this.correctAnswers,
                    time: time,
                })
            );
        }
        this.requestFrameUpdate();
    }
    /**
     * 
     * @param {string} selectedAnswer 
     */
    processAnswer(selectedAnswer) {
        const result = /**@type {Result} */(eskv.App.get().findById('result'));
        if(selectedAnswer===this.answers[this.currentQuestion]) {
            result.state = 'correct';
            this.correctAnswers++;
        } else {
            result.state = 'incorrect';
        }
        const answerOptions = this.findById('answerOptions')?.children.slice();
        //@ts-ignore
        const w = answerOptions.find((w)=>w.text===this.answers[this.currentQuestion]);
        if(w instanceof AnswerButton) w.bgColor = w.selectColor;
        setTimeout(() => {
            this.next()
        }, 3000);
}
    /**
     * Static method to retrieve the singleton app instance
     * @returns {Alphabetical}
     */
    static get() { //singleton
        return /**@type {Alphabetical}*/(eskv.App.get());
    }
}



//Start the app
new Alphabetical().start();
