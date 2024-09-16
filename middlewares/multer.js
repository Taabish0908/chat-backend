import multer from "multer";


// export const upload = multer({ dest: "uploads/" })
const upload = multer({ 
    limits: {
        fileSize: 1024 * 1024 * 5
    }
})

export { upload }