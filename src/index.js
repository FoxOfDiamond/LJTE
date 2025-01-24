import * as pdfjs from "pdfjs-dist"
import "pdfjs-dist/build/pdf.worker.mjs"
/** @type {HTMLCanvasElement} */ 
const canvas=document.getElementById("pdf-canvas");
const textCanvas=document.getElementsByClassName("fake-canvas")[0];
const canvasContainer=document.getElementsByClassName("canvas-container")[0];
const context=canvas.getContext("2d")
const reScale=1
let pdfName=""
let pageNumber=1
document.getElementById("jump-page-box").value=pageNumber

let currentPdf

pdfjs.GlobalWorkerOptions.workerSrc='pdfjs-dist/build/pdf.worker.mjs'
document.getElementById("upload-file").onclick=async ()=>{
    const [FileHandler]=await window.showOpenFilePicker()
    const File=await FileHandler.getFile()
    pdfName=File.name
    const Reader=new FileReader()
    Reader.onload=()=>{
        const raw=Reader.result
        const loadingTask=pdfjs.getDocument(raw)
        loadingTask.promise.then(pdf=>{
            console.log("Pdf loaded")

            let newL=localStorage.getItem(pdfName)
            if (newL){
                pageNumber=JSON.parse(newL).lastPage
                if (!pageNumber){
                    pageNumber=1
                }
            }

            currentPdf=pdf
            document.getElementById("jump-page-box").value=pageNumber
            renderPage()
        })
    }
    Reader.readAsArrayBuffer(File)
}

document.getElementById("last-page").onclick=()=>{
    pageNumber=Math.max(1,pageNumber-1)
    document.getElementById("jump-page-box").value=pageNumber
    renderPage()
}

document.getElementById("next-page").onclick=()=>{
    pageNumber+=1
    if (currentPdf){
        pageNumber=Math.min(currentPdf.numPages,pageNumber)
    }
    document.getElementById("jump-page-box").value=pageNumber
    renderPage()
}
document.getElementById("jump-page-button").onclick=()=>{
    pageNumber=document.getElementById("jump-page-box").value
    pageNumber=Math.max(1,pageNumber)
    if (currentPdf){
        pageNumber=Math.min(currentPdf.numPages,pageNumber)
    }
    document.getElementById("jump-page-box").value=pageNumber
    renderPage()
}
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        window.open("https://jisho.org/search/"+window.getSelection().toString(),"","popup=true")
    }else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault()
        

        let newL=localStorage.getItem(pdfName)
        if (!newL){
            newL={}
        }else{
            newL=JSON.parse(newL)
        }
        if (newL[window.getSelection().toString()]){
            delete newL[window.getSelection().toString()]
        }else{
            newL[window.getSelection().toString()]='#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')
        }
        localStorage.setItem(pdfName,JSON.stringify(newL))

        highlightAll()
    }
});
function highlightAll(){
    let highlights=localStorage.getItem(pdfName)
    if (highlights){
        highlights=JSON.parse(highlights)
        for(const char in highlights){
            if (char=="lastPage"){continue}
            textCanvas.innerHTML=textCanvas.innerHTML.replace(new RegExp(char, "g"),"<span style='color:"+highlights[char]+"'>"+char+"</span>");
        }
    }
}
async function renderPage(){
    if (currentPdf){

        let newL=localStorage.getItem(pdfName)
        if (!newL){
            newL={}
        }else{
            newL=JSON.parse(newL)
        }
        newL.lastPage=pageNumber
        localStorage.setItem(pdfName,JSON.stringify(newL))

        currentPdf.getPage(pageNumber).then(async page=>{
            const pageViewport=page.getViewport({scale:reScale})
            canvas.width=pageViewport.width
            canvas.height=pageViewport.height
            canvasContainer.style.aspectRatio=pageViewport.viewBox[2]/pageViewport.viewBox[3]
            const text=await page.getTextContent()
            const styles=text.styles
            const canvasScale=canvasContainer.offsetHeight/pageViewport.height*reScale
            let output=""
            /*await page.render({
                canvasContext:context,
                viewport:pageViewport
            }).promise*/
            textCanvas.innerHTML=""
            for (let i=0;i<text.items.length;i++){
                const word=text.items[i]

                const show=document.createElement("div")
                show.innerHTML=word.str
                textCanvas.appendChild(show)
                show.className="text"
                show.style.top=textCanvas.offsetHeight-word.transform[5]*canvasScale
                show.style.left=word.transform[4]*canvasScale
                show.style.font=word.height*canvasScale+"px "+styles[word.fontName].fontFamily
                show.style.height=word.height*canvasScale
                show.style.width=word.width*canvasScale*2


                context.fillText(word.str,word.transform[4]*reScale,canvas.height-word.transform[5]*reScale)
                output+=word.str
            }
            highlightAll()
        })
    }
}