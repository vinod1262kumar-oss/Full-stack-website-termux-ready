import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";
import slugify from "slugify";

const app=express();
const PORT=Number(process.env.PORT||3000);
const ROOT=process.cwd();
const DATA_DIR=path.join(ROOT,"data");
const DB_FILE=path.join(DATA_DIR,"aura-data.json");
const UPLOAD_DIR=process.env.UPLOAD_DIR||path.join(ROOT,"uploads");
const JWT_SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET";
const ADMIN_EMAIL=process.env.ADMIN_EMAIL||"admin@example.com";
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"change-me";
fs.mkdirSync(DATA_DIR,{recursive:true}); fs.mkdirSync(UPLOAD_DIR,{recursive:true});
const demos=[
{slug:"grand-horizon",name:"The Grand Horizon",type:"Luxury Villa",price:"₹4.50 Cr",beds:4,baths:5,area:"4,800 sq.ft.",description:"A statement residence created for exceptional living.",overview:"The Grand Horizon combines sophisticated architecture with generous living spaces, refined finishes and a private environment designed for timeless comfort.",image_url:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"},
{slug:"aura-heights",name:"Aura Heights",type:"Modern Residence",price:"₹2.50 Cr",beds:3,baths:4,area:"3,200 sq.ft.",description:"A contemporary residence designed for elevated everyday living.",overview:"Aura Heights combines contemporary architecture, refined interiors and thoughtfully designed spaces.",image_url:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85"},
{slug:"serenity",name:"The Serenity",type:"Private Estate",price:"₹6.50 Cr",beds:5,baths:6,area:"6,100 sq.ft.",description:"A private estate where space, tranquillity and elegance meet.",overview:"The Serenity offers a generous private residence created for relaxed and sophisticated living.",image_url:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85"}
];
function load(){if(!fs.existsSync(DB_FILE)){let d={nextId:4,properties:demos.map((p,i)=>({...p,id:i+1,created_at:new Date().toISOString()})),leads:[],views:[]};fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));return d}try{return JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}catch{return {nextId:1,properties:[],leads:[],views:[]}}}
let db=load(); function save(){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}
app.use(express.json({limit:"1mb"}));app.use(express.urlencoded({extended:true}));app.use(cookieParser());
const limiter=rateLimit({windowMs:60000,max:100});app.use("/api",limiter);
function auth(req,res,next){try{const t=req.cookies.aura_admin;if(!t)throw 0;req.admin=jwt.verify(t,JWT_SECRET);next()}catch{res.status(401).json({error:"Authentication required"})}}
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,UPLOAD_DIR),filename:(_,f,cb)=>cb(null,crypto.randomUUID()+path.extname(f.originalname).toLowerCase())});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(_,f,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(f.mimetype))});
app.post("/api/auth/login",async(req,res)=>{const {email,password}=req.body||{};if(email!==ADMIN_EMAIL||!(await bcrypt.compare(String(password||""),await bcrypt.hash(ADMIN_PASSWORD,10))))return res.status(401).json({error:"Invalid credentials"});res.cookie("aura_admin",jwt.sign({role:"admin",email:ADMIN_EMAIL},JWT_SECRET,{expiresIn:"8h"}),{httpOnly:true,sameSite:"lax",secure:false,maxAge:8*60*60*1000});res.json({ok:true})});
app.get("/api/auth/me",auth,(req,res)=>res.json({email:req.admin.email}));app.post("/api/auth/logout",(req,res)=>{res.clearCookie("aura_admin");res.json({ok:true})});
function pub(p){return {...p,views:db.views.filter(v=>v.property_id===p.id).length}}
app.get("/api/properties",(req,res)=>res.json(db.properties.map(pub)));app.get("/api/properties/all",auth,(req,res)=>res.json(db.properties.map(pub)));
app.get("/api/properties/:slug",(req,res)=>{const p=db.properties.find(x=>x.slug===req.params.slug);if(!p)return res.status(404).json({error:"Property not found"});res.json(pub(p))});
app.post("/api/properties",auth,upload.single("image"),(req,res)=>{try{const b=req.body||{};if(!b.name||!b.type||!b.price||!b.beds||!b.baths||!b.area||!b.description||!b.overview||!req.file)return res.status(400).json({error:"All property fields and an image are required"});const base=slugify(b.name,{lower:true,strict:true})||crypto.randomUUID().slice(0,8);let slug=base,n=2;while(db.properties.some(p=>p.slug===slug))slug=`${base}-${n++}`;const p={id:db.nextId++,slug,name:b.name,type:b.type,price:b.price,beds:Number(b.beds),baths:Number(b.baths),area:b.area,description:b.description,overview:b.overview,image_url:"/uploads/"+req.file.filename,created_at:new Date().toISOString()};db.properties.push(p);save();res.status(201).json(p)}catch(e){if(req.file)fs.rmSync(path.join(UPLOAD_DIR,req.file.filename),{force:true});res.status(500).json({error:"Could not create property"})}});
app.delete("/api/properties/:id",auth,(req,res)=>{const i=db.properties.findIndex(p=>p.id===Number(req.params.id));if(i<0)return res.status(404).json({error:"Property not found"});const p=db.properties[i];db.properties.splice(i,1);if(p.image_url?.startsWith("/uploads/"))fs.rmSync(path.join(UPLOAD_DIR,path.basename(p.image_url)),{force:true});save();res.json({ok:true})});
app.post("/api/leads",(req,res)=>{const {name,email,phone,message,propertySlug}=req.body||{};if(!name||!email||!message)return res.status(400).json({error:"Name, email and message are required"});const p=db.properties.find(x=>x.slug===propertySlug);db.leads.push({id:Date.now(),name:String(name).slice(0,100),email:String(email).slice(0,200),phone:String(phone||"").slice(0,40),message:String(message).slice(0,4000),property_id:p?.id||null,created_at:new Date().toISOString()});save();res.status(201).json({ok:true})});
app.get("/api/leads",auth,(req,res)=>res.json(db.leads.slice().reverse()));
app.post("/api/analytics/page-view",(req,res)=>{const p=db.properties.find(x=>x.slug===req.body?.propertyId);db.views.push({id:Date.now()+Math.random(),page:String(req.body?.page||"/").slice(0,300),property_id:p?.id||null,created_at:new Date().toISOString()});save();res.status(204).end()});
app.get("/api/analytics",auth,(req,res)=>res.json({pages:Object.entries(db.views.reduce((a,v)=>(a[v.page]=(a[v.page]||0)+1,a),{})).map(([page,views])=>({page,views})).sort((a,b)=>b.views-a.views)}));
app.get("/api/analytics/summary",auth,(req,res)=>res.json({properties:db.properties.length,leads:db.leads.length,pageViews:db.views.length,propertyViews:db.views.filter(v=>v.property_id).length}));
app.use("/uploads",express.static(UPLOAD_DIR));app.use(express.static(ROOT));app.get("*",(req,res)=>req.path.startsWith("/api/")?res.status(404).json({error:"Not found"}):res.sendFile(path.join(ROOT,"index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log(`AURA ESTATES running on http://localhost:${PORT}`));
