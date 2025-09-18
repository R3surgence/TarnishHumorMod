//this is just like a little tutorial to load in the resources you want to use
document.addEventListener('corru_entered', ()=>{
    if(page.path == '/local/beneath/embassy/' || page.path == '/local/ozo/') { //basically where you want the resource to be loaded in (ex: "/local/ocean/embassy/" (wont work in any other page)
    addResources(["https://github.com/R3surgence/TarnishHumorMod/blob/main/something.file"]) //replace "something.file" with the resource name with like "Tarnish_PublicBeta.js"
    addResources(["https://adenator.neocities.org/corrumods/literallyTooManyHumors.js"]) //this is optional, but i mainly like to use it for convienience
    }
}) //keep the document part or else it wont work
//that concludes the example/tutorial or whatever you wanna call it
