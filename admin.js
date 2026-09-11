const API="/api";
const $=id=>document.getElementById(id);
async function api(path,options={}) {
  const res=await fetch(API+path,{credentials:"include",...options});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||"Request failed");
  return data;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function check(){
  try { await api("/auth/me"); $("loginView").hidden=true; $("dashboardView").hidden=false; refresh(); }
  catch { $("loginView").hidden=false; $("dashboardView").hidden=true; }
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("loginMessage").textContent="";
  try{
    await api("/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("loginEmail").value,password:$("loginPassword").value})});
    check();
  }catch(err){$("loginMessage").textContent=err.message}
});
$("logoutBtn").addEventListener("click",async()=>{await api("/auth/logout",{method:"POST"});location.reload();});

$("propertyForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("propertyMessage").textContent="Uploading…";
  try{
    const fd=new FormData(e.target);
    const res=await fetch(API+"/properties",{method:"POST",body:fd,credentials:"include"});
    const data=await res.json(); if(!res.ok) throw new Error(data.error||"Upload failed");
    e.target.reset(); $("propertyMessage").textContent="Property added successfully."; refresh();
  }catch(err){$("propertyMessage").textContent=err.message}
});

async function refresh(){
  try{
    const [stats,props,leads,analytics]=await Promise.all([
      api("/analytics/summary"),api("/properties/all"),api("/leads"),api("/analytics")
    ]);
    $("stats").innerHTML=[
      ["Properties",stats.properties],["Enquiries",stats.leads],["Page Views",stats.pageViews],["Property Views",stats.propertyViews]
    ].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

    $("propertiesAdmin").innerHTML=props.length?`<table class="admin-table"><thead><tr><th>Property</th><th>Price</th><th>Views</th><th>Action</th></tr></thead><tbody>${
      props.map(p=>`<tr><td>${esc(p.name)}<br><small>${esc(p.type)}</small></td><td>${esc(p.price)}</td><td>${p.views||0}</td><td><button onclick="removeProperty(${p.id})">Remove</button></td></tr>`).join("")
    }</tbody></table>`:"<p>No properties.</p>";

    $("leads").innerHTML=leads.length?`<table class="admin-table"><thead><tr><th>Date</th><th>Client</th><th>Contact</th><th>Property</th><th>Message</th></tr></thead><tbody>${
      leads.map(l=>`<tr><td>${esc(new Date(l.created_at).toLocaleString())}</td><td>${esc(l.name)}</td><td>${esc(l.email)}<br>${esc(l.phone||"")}</td><td>${esc(l.property_name||"General enquiry")}</td><td>${esc(l.message)}</td></tr>`).join("")
    }</tbody></table>`:"<p>No enquiries yet.</p>";

    $("analytics").innerHTML=`<table class="admin-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>${
      analytics.pages.map(x=>`<tr><td>${esc(x.page)}</td><td>${x.views}</td></tr>`).join("")
    }</tbody></table>`;
  }catch(err){console.error(err)}
}
async function removeProperty(id){
  if(!confirm("Remove this property from the website?")) return;
  try{await api("/properties/"+id,{method:"DELETE"});refresh()}catch(e){alert(e.message)}
}
check();
