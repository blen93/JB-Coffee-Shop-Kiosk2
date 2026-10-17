/* JB Coffee Shop self-service kiosk.
   Local-only demo: data is stored in this browser's localStorage.
   Change STAFF_PIN before public use. This is not secure authentication.
*/
(() => {
  "use strict";
  const STAFF_PIN = "1234"; // CHANGE THIS before use.
  const DB_KEY = "jbCoffeeShopDB_v1";
  const SETTINGS_KEY = "jbCoffeeShopSettings_v1";
  const $ = id => document.getElementById(id);
  const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2});
  const today = () => new Date().toLocaleDateString("en-CA");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const seedMenu = [
    {id:"americano",name:"Americano",category:"Hot Coffee",price:80,description:"Rich espresso with hot water.",emoji:"☕",active:true},
    {id:"cappuccino",name:"Cappuccino",category:"Hot Coffee",price:100,description:"Espresso, steamed milk and soft foam.",emoji:"🥛",active:true},
    {id:"cafe-latte",name:"Café Latte",category:"Hot Coffee",price:110,description:"Smooth espresso with creamy milk.",emoji:"☕",active:true},
    {id:"spanish-latte",name:"Spanish Latte",category:"Hot Coffee",price:125,description:"Espresso with sweet, creamy milk.",emoji:"🤎",active:true},
    {id:"iced-latte",name:"Iced Latte",category:"Iced Coffee",price:110,description:"Chilled espresso and milk over ice.",emoji:"🧋",active:true},
    {id:"iced-americano",name:"Iced Americano",category:"Iced Coffee",price:90,description:"Bold espresso served over ice.",emoji:"🧊",active:true},
    {id:"iced-mocha",name:"Iced Mocha",category:"Iced Coffee",price:120,description:"Coffee, chocolate and cold milk.",emoji:"🍫",active:true},
    {id:"caramel-macchiato",name:"Caramel Macchiato",category:"Iced Coffee",price:135,description:"Espresso, milk and caramel flavor.",emoji:"🍮",active:true},
    {id:"matcha-latte",name:"Matcha Latte",category:"Non-Coffee",price:120,description:"Earthy matcha with creamy milk.",emoji:"🍵",active:true},
    {id:"chocolate",name:"Chocolate",category:"Non-Coffee",price:100,description:"A comforting chocolate drink.",emoji:"🍫",active:true},
    {id:"croissant",name:"Butter Croissant",category:"Pastries",price:75,description:"Flaky, buttery pastry.",emoji:"🥐",active:true},
    {id:"brownie",name:"Chocolate Brownie",category:"Pastries",price:65,description:"Chocolatey bite to pair with coffee.",emoji:"🍰",active:true}
  ];
  let db = loadDB();
  let settings = loadSettings();
  let cart = [];
  let activeCategory = "All";
  let currentFilter = "All";
  let currentView = "welcomeView";
  let selectedDrink = null;

  function loadDB() {
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY));
      if (saved && Array.isArray(saved.orders) && Array.isArray(saved.menu)) return saved;
    } catch (_) {}
    return {orders:[], menu:seedMenu, nextOrder:1};
  }
  function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {shopName:"JB Coffee Shop", staffPin:STAFF_PIN, paymentNote:"Ask cashier for official GCash QR"}; }
    catch (_) { return {shopName:"JB Coffee Shop",staffPin:STAFF_PIN,paymentNote:"Ask cashier for official GCash QR"}; }
  }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    $(id).classList.remove("hidden"); currentView = id;
    window.scrollTo({top:0,behavior:"smooth"});
    if (id === "menuView") renderMenu();
    if (id === "checkoutView") renderCheckout();
    if (id === "staffView") renderStaff();
  }
  function activeMenu() { return db.menu.filter(m => m.active !== false); }
  function renderCategories() {
    const categories = ["All", ...new Set(activeMenu().map(m => m.category))];
    if (!categories.includes(activeCategory)) activeCategory = "All";
    $("categoryTabs").innerHTML = categories.map(c => `<button class="category-tab ${c===activeCategory?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
    $("categoryTabs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {activeCategory=b.dataset.category;renderMenu();}));
  }
  function renderMenu() {
    renderCategories();
    const menu = activeMenu().filter(m => activeCategory==="All" || m.category===activeCategory);
    $("menuGrid").innerHTML = menu.map(m => `<article class="menu-card"><div class="drink-art ${m.image?"has-photo":""}">${m.image?`<img src="${m.image}" alt="${esc(m.name)}">`:`<span>${esc(m.emoji||"☕")}</span>`}</div><div class="menu-card-content"><h3>${esc(m.name)}</h3><p>${esc(m.description||"Made fresh for you.")}</p><div class="menu-card-bottom"><span class="price">${money(m.price)}</span><button class="add-btn" data-add="${esc(m.id)}" aria-label="Customize ${esc(m.name)}">+</button></div></div></article>`).join("") || '<p class="empty-state">No items in this category yet.</p>';
    $("menuGrid").querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => openCustomize(b.dataset.add)));
    renderCart();
  }
  function openCustomize(id) {
    selectedDrink = activeMenu().find(m => m.id===id); if (!selectedDrink) return;
    $("customizeId").value = id; $("customizeTitle").textContent = selectedDrink.name;
    $("customizeDescription").textContent = selectedDrink.description || "";
    $("customSize").value = "Regular|0"; $("customTemperature").value = selectedDrink.category==="Iced Coffee" ? "Iced" : "Hot";
    $("customSweetness").value = "Regular"; $("customMilk").value = "Regular milk"; $("customExtra").value = "None|0"; $("customQty").value = 1;
    updateCustomPrice();
    if ($("customizeDialog").showModal) $("customizeDialog").showModal(); else alert("Your browser does not support the customization dialog.");
  }
  function splitChoice(v) { const p=v.split("|"); return {name:p[0],price:Number(p[1]||0)}; }
  function itemPrice() {
    if (!selectedDrink) return 0;
    const size=splitChoice($("customSize").value), milk=splitChoice($("customMilk").value), extra=splitChoice($("customExtra").value);
    return Number(selectedDrink.price)+size.price+milk.price+extra.price;
  }
  function updateCustomPrice() { $("customPrice").textContent=money(itemPrice()*Math.max(1,Math.min(20,Number($("customQty").value)||1))); }
  function addSelectedToCart() {
    if (!selectedDrink) return;
    const size=splitChoice($("customSize").value), milk=splitChoice($("customMilk").value), extra=splitChoice($("customExtra").value);
    const options={size:size.name,temperature:$("customTemperature").value,sweetness:$("customSweetness").value,milk:milk.name,extra:extra.name};
    const qty=Math.max(1,Math.min(20,Number($("customQty").value)||1));
    const unitPrice=itemPrice();
    for(let i=0;i<qty;i++) cart.push({cartId:Date.now()+"_"+Math.random().toString(36).slice(2),id:selectedDrink.id,name:selectedDrink.name,emoji:selectedDrink.emoji,options:{...options},unitPrice});
    $("customizeDialog").close(); renderCart();
  }
  function optionText(o) { return [o.size,o.temperature,o.sweetness,o.milk,o.extra!=="None"?o.extra:null].filter(Boolean).join(" · "); }
  function renderCart() {
    const count=cart.length; $("cartCount").textContent=count;
    $("cartTotal").textContent=money(cart.reduce((s,i)=>s+i.unitPrice,0));
    $("checkoutButton").disabled=count===0;
    if(!count){$("cartItems").innerHTML='<p class="empty-state">Your cart is waiting for something delicious.</p>';return;}
    const groups=[];
    cart.forEach(item=>{const key=item.id+"|"+JSON.stringify(item.options);let g=groups.find(x=>x.key===key);if(!g){g={key,item,qty:0,total:0};groups.push(g)}g.qty++;g.total+=item.unitPrice;});
    $("cartItems").innerHTML=groups.map(g=>`<div class="cart-item"><div><strong>${esc(g.item.emoji||"☕")} ${esc(g.item.name)} × ${g.qty}</strong><small>${esc(optionText(g.item.options))}</small><button class="remove-item" data-remove="${esc(g.key)}">Remove one</button></div><div class="cart-item-price">${money(g.total)}</div></div>`).join("");
    $("cartItems").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{const idx=cart.findIndex(i=>i.id+"|"+JSON.stringify(i.options)===b.dataset.remove);if(idx>=0)cart.splice(idx,1);renderCart();}));
  }
  function cartGroups() {
    const groups=[];
    cart.forEach(item=>{const key=item.id+"|"+JSON.stringify(item.options);let g=groups.find(x=>x.key===key);if(!g){g={key,id:item.id,name:item.name,options:item.options,unitPrice:item.unitPrice,qty:0};groups.push(g)}g.qty++;});
    return groups.map(g=>({...g,total:g.qty*g.unitPrice}));
  }
  function renderCheckout() {
    const groups=cartGroups();
    $("checkoutSummary").innerHTML=groups.map(g=>`<div class="cart-item"><div><strong>${esc(g.name)} × ${g.qty}</strong><small>${esc(optionText(g.options))}</small></div><div class="cart-item-price">${money(g.total)}</div></div>`).join("") || '<p class="muted">Your cart is empty.</p>';
    $("checkoutTotal").textContent=money(cart.reduce((s,i)=>s+i.unitPrice,0));
  }
  function placeOrder() {
    if(!cart.length){showView("menuView");return;}
    const payment=document.querySelector('input[name="paymentMethod"]:checked')?.value||"Cash at cashier";
    const orderNo="JB-"+String(db.nextOrder).padStart(4,"0");
    const order={id:orderNo,createdAt:new Date().toISOString(),date:today(),customer:$("customerName").value.trim()||"Walk-in customer",payment,notes:$("orderNotes").value.trim(),items:cartGroups(),total:cart.reduce((s,i)=>s+i.unitPrice,0),status:"New",paid:false};
    db.nextOrder++; db.orders.unshift(order); saveDB();
    $("confirmationNumber").textContent=orderNo;
    $("confirmationPayment").textContent=payment==="GCash / QR"?"Please ask the cashier for the official GCash QR and show your payment confirmation.":"Please pay the cashier and give them your order number.";
    cart=[]; $("customerName").value=""; $("orderNotes").value="";
    showView("confirmationView");
  }
  function findOrder(value) {return db.orders.find(o=>o.id.toLowerCase()===value.trim().toLowerCase());}
  function renderTrack() {
    const order=findOrder($("trackInput").value);
    if(!order){$("trackResult").innerHTML='<p class="muted">Order not found. Check the number and try again.</p>';return;}
    $("trackResult").innerHTML=`<div class="checkout-card"><p class="eyebrow">${esc(order.id)}</p><h2>${esc(order.customer)}</h2><span class="status-pill ${order.status.toLowerCase()}">${esc(order.status)}</span><div class="cart-total"><span>Order total</span><strong>${money(order.total)}</strong></div><p class="muted tiny">${order.items.map(i=>`${i.qty} × ${esc(i.name)}`).join("<br>")}</p></div>`;
  }
  function statusClass(status) {return status.toLowerCase();}
  function renderStaff() {
    $("staffLogin").classList.remove("hidden"); $("staffDashboard").classList.add("hidden"); $("staffPin").value="";
    $("shopName").value=settings.shopName||"JB Coffee Shop"; $("gcashInfo").value=settings.paymentNote||"";
  }
  function unlockStaff() {
    if($("staffPin").value!==String(settings.staffPin||STAFF_PIN)){alert("Incorrect PIN. Please try again.");return;}
    $("staffLogin").classList.add("hidden");$("staffDashboard").classList.remove("hidden");renderDashboard();
  }
  function renderDashboard() {
    const todayOrders=db.orders.filter(o=>o.date===today());
    $("statOrders").textContent=todayOrders.length;
    $("statOpen").textContent=db.orders.filter(o=>o.status!=="Completed").length;
    $("statSales").textContent=money(todayOrders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0));
    const orders=db.orders.filter(o=>currentFilter==="All"||o.status===currentFilter);
    $("staffOrders").innerHTML=orders.map(o=>`<article class="staff-order"><div class="staff-order-head"><div><h3>${esc(o.id)}</h3><div>${esc(o.customer)} · ${new Date(o.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div class="muted">${esc(o.payment)} ${o.paid?"· PAID":"· PAYMENT PENDING"}</div></div><span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span></div><div class="staff-order-items">${o.items.map(i=>`${i.qty} × ${esc(i.name)} (${esc(optionText(i.options))})`).join("<br>")}${o.notes?`<br><i>Note: ${esc(o.notes)}</i>`:""}</div><div class="staff-order-foot"><strong>${money(o.total)}</strong><div><label class="tiny" for="status-${esc(o.id)}">Status</label><select id="status-${esc(o.id)}" data-status="${esc(o.id)}"><option ${o.status==="New"?"selected":""}>New</option><option ${o.status==="Preparing"?"selected":""}>Preparing</option><option ${o.status==="Ready"?"selected":""}>Ready</option><option ${o.status==="Completed"?"selected":""}>Completed</option></select><label class="tiny"><input type="checkbox" data-paid="${esc(o.id)}" ${o.paid?"checked":""}> Paid</label></div></div></article>`).join("") || '<div class="checkout-card"><p class="empty-state">No orders in this filter yet.</p></div>';
    $("staffOrders").querySelectorAll("[data-status]").forEach(s=>s.addEventListener("change",()=>{const o=findOrder(s.dataset.status);if(o){o.status=s.value;saveDB();renderDashboard();}}));
    $("staffOrders").querySelectorAll("[data-paid]").forEach(c=>c.addEventListener("change",()=>{const o=findOrder(c.dataset.paid);if(o){o.paid=c.checked;saveDB();renderDashboard();}}));
    renderManageMenu();
  }
  function renderManageMenu() {
    $("manageMenu").innerHTML=db.menu.map(m=>`<div class="manage-menu-row"><div class="manage-menu-product"><div class="manage-menu-thumb">${m.image?`<img src="${m.image}" alt="">`:esc(m.emoji||"☕")}</div><div class="manage-menu-name"><b>${esc(m.name)}</b><br><small>${money(m.price)} ${m.active===false?"· Hidden":"· Available"}</small></div></div><div class="manage-menu-actions"><label class="upload-image-button">${m.image?"Change image":"Upload image"}<input type="file" accept="image/*" data-image="${esc(m.id)}"></label><button data-toggle="${esc(m.id)}">${m.active===false?"Show":"Hide"}</button><button data-delete="${esc(m.id)}">Delete</button></div></div>`).join("");
    $("manageMenu").querySelectorAll("[data-image]").forEach(input=>input.addEventListener("change",async()=>{
      const file=input.files&&input.files[0]; if(!file)return;
      if(!file.type.startsWith("image/")){alert("Please select an image file.");input.value="";return;}
      try{const image=await compressImage(file);const product=db.menu.find(x=>x.id===input.dataset.image);if(product){product.image=image;saveDB();renderDashboard();alert("Product image saved.");}}
      catch(err){alert("Could not load that image. Please try another photo.");}
    }));
    $("manageMenu").querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>{const m=db.menu.find(x=>x.id===b.dataset.toggle);if(m)m.active=m.active===false;saveDB();renderDashboard();}));
    $("manageMenu").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>{if(confirm("Delete this menu item? Existing orders will remain.")){db.menu=db.menu.filter(x=>x.id!==b.dataset.delete);saveDB();renderDashboard();}}));
  }
  function compressImage(file, maxDimension=720, quality=0.78) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error("File read failed"));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error("Image decode failed"));
        img.onload=()=>{
          const scale=Math.min(1,maxDimension/Math.max(img.width,img.height));
          const canvas=document.createElement("canvas");
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          const ctx=canvas.getContext("2d");
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL("image/jpeg",quality));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function addDrink() {
    const name=$("newDrinkName").value.trim(), category=$("newDrinkCategory").value, price=Number($("newDrinkPrice").value), description=$("newDrinkDescription").value.trim(), file=$("newDrinkImage").files&&$("newDrinkImage").files[0];
    if(!name||!Number.isFinite(price)||price<=0){alert("Enter a drink name and a valid price.");return;}
    const finishAdd = image => {
      db.menu.push({id:"custom-"+Date.now(),name,category,price,description,image:image||"",emoji:category==="Pastries"?"🥐":category==="Non-Coffee"?"🍵":category==="Iced Coffee"?"🧋":"☕",active:true});
      saveDB();$("newDrinkName").value="";$("newDrinkPrice").value="";$("newDrinkDescription").value="";$("newDrinkImage").value="";$("newDrinkImagePreview").classList.add("hidden");$("newDrinkPreviewImg").src="";renderDashboard();alert("Menu item added.");
    };
    if(file){if(!file.type.startsWith("image/")){alert("Please select an image file.");return;}compressImage(file).then(finishAdd).catch(()=>alert("Could not load that image. Please try another photo."));}
    else finishAdd("");
  }
  function downloadFile(name,content,type) {
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const rows=[["Order","Date","Customer","Payment","Paid","Status","Items","Total"]];
    db.orders.forEach(o=>rows.push([o.id,o.createdAt,o.customer,o.payment,o.paid?"Yes":"No",o.status,o.items.map(i=>`${i.qty}x ${i.name} (${optionText(i.options)})`).join("; "),o.total]));
    const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    downloadFile("jb-coffee-orders.csv","\ufeff"+csv,"text/csv;charset=utf-8");
  }
  function backupData() {downloadFile("jb-coffee-backup-"+today()+".json",JSON.stringify({exportedAt:new Date().toISOString(),db,settings},null,2),"application/json");}
  function clearCompleted() {const count=db.orders.filter(o=>o.status==="Completed").length;if(!count){alert("There are no completed orders to delete.");return;}if(confirm(`Delete ${count} completed order(s)? Download a backup first if you need these records.`)){db.orders=db.orders.filter(o=>o.status!=="Completed");saveDB();renderDashboard();}}
  $("startOrder").addEventListener("click",()=>showView("menuView"));
  $("backHome").addEventListener("click",()=>showView("welcomeView"));
  $("checkoutButton").addEventListener("click",()=>showView("checkoutView"));
  $("backToMenu").addEventListener("click",()=>showView("menuView"));
  $("placeOrder").addEventListener("click",placeOrder);
  $("newOrder").addEventListener("click",()=>showView("welcomeView"));
  $("trackButton").addEventListener("click",()=>showView("trackView"));
  $("trackBack").addEventListener("click",()=>showView("welcomeView"));
  $("trackSearch").addEventListener("click",renderTrack);
  $("trackInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderTrack();});
  $("staffButton").addEventListener("click",()=>showView("staffView"));
  $("staffExit").addEventListener("click",()=>showView("welcomeView"));
  $("staffLoginButton").addEventListener("click",unlockStaff);
  $("staffPin").addEventListener("keydown",e=>{if(e.key==="Enter")unlockStaff();});
  $("customSize").addEventListener("change",updateCustomPrice);$("customMilk").addEventListener("change",updateCustomPrice);$("customExtra").addEventListener("change",updateCustomPrice);$("customQty").addEventListener("input",updateCustomPrice);
  $("closeCustomize").addEventListener("click",()=>$("customizeDialog").close());
  $("addToCart").addEventListener("click",addSelectedToCart);
  document.querySelectorAll('input[name="paymentMethod"]').forEach(r=>r.addEventListener("change",()=>{$("gcashNotice").classList.toggle("hidden",r.value!=="GCash / QR"||!r.checked);}));
  $("orderFilters").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;$("orderFilters").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));renderDashboard();}));
  $("saveSettings").addEventListener("click",()=>{const name=$("shopName").value.trim();if(name)settings.shopName=name;const pin=$("newPin").value.trim();if(pin)settings.staffPin=pin;settings.paymentNote=$("gcashInfo").value.trim();saveSettings();$("newPin").value="";document.querySelector(".brand strong").textContent=settings.shopName.toUpperCase();document.title=settings.shopName+" | Self-Service Ordering";alert("Settings saved on this device.");});
  $("newDrinkImage").addEventListener("change",async()=>{
    const file=$("newDrinkImage").files&&$("newDrinkImage").files[0];
    if(!file){$("newDrinkImagePreview").classList.add("hidden");return;}
    if(!file.type.startsWith("image/")){alert("Please select an image file.");$("newDrinkImage").value="";return;}
    try{const preview=await compressImage(file,360,0.75);$("newDrinkPreviewImg").src=preview;$("newDrinkImagePreview").classList.remove("hidden");}
    catch(_){alert("Could not preview that image.");$("newDrinkImage").value="";}
  });
  $("addDrink").addEventListener("click",addDrink);$("exportOrders").addEventListener("click",exportCSV);$("backupData").addEventListener("click",backupData);$("clearCompleted").addEventListener("click",clearCompleted);
  $("year").textContent=new Date().getFullYear();
  document.querySelector(".brand strong").textContent=(settings.shopName||"JB Coffee Shop").toUpperCase();
  document.title=(settings.shopName||"JB Coffee Shop")+" | Self-Service Ordering";
  saveDB();
})();