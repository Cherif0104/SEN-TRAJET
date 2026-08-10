const C = window.SENTRAJET_CONFIG || {};
const hasSupabase = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
const sb = hasSupabase ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

const state = {
  role: localStorage.getItem("sj_role") || "admin",
  page: localStorage.getItem("sj_page") || "dashboard",
  modal: null,
  reservations: [
    {id:"SJ-1042", client:"Sakina Conciergerie", type:"AIBD → Dakar", date:"10 août 2026", time:"14:30", pax:4, driver:"Moussa D.", status:"Confirmée", price:"25 000 F"},
    {id:"SJ-1043", client:"Mme Gueye", type:"Dakar → Mbour", date:"11 août 2026", time:"09:00", pax:3, driver:"À assigner", status:"À assigner", price:"80 750 F"},
    {id:"SJ-1044", client:"Entreprise ABC", type:"Mise à disposition", date:"12 août 2026", time:"08:00", pax:2, driver:"Cheikh S.", status:"En attente", price:"Sur devis"}
  ],
  drivers: [
    {name:"Moussa Diop", phone:"+221 77 000 00 01", vehicle:"Hyundai Starex", status:"Disponible", trips:18},
    {name:"Cheikh Seck", phone:"+221 77 000 00 02", vehicle:"Mercedes Vito", status:"En course", trips:24},
    {name:"Ibrahima Fall", phone:"+221 77 000 00 03", vehicle:"Hyundai Starex", status:"Disponible", trips:15},
    {name:"Abdou Ndiaye", phone:"+221 77 000 00 04", vehicle:"Kia Carnival", status:"Hors ligne", trips:9}
  ],
  partners: [
    {name:"Sakina Conciergerie", company:"Challeng'in Group SARL", tier:"B2B validé", tariff:"700 F/km", status:"Actif"},
    {name:"Hôtel Premium Dakar", company:"Hôtel Premium", tier:"B2B validé", tariff:"700 F/km", status:"Actif"},
    {name:"Agence Voyage Sénégal", company:"AVS", tier:"En validation", tariff:"Tarif direct", status:"Prospect"}
  ]
};

const navByRole = {
  admin: [
    ["dashboard","⌂","Vue d’ensemble"],["reservations","▣","Réservations"],["dispatch","⇄","Dispatch"],["drivers","♙","Chauffeurs"],["partners","◈","Partenaires"],["clients","◎","Clients"],["fleet","▤","Flotte"],["pricing","₣","Tarification"],["reports","▥","Rapports"],["settings","⚙","Paramètres"]
  ],
  client: [["dashboard","⌂","Accueil"],["new-booking","＋","Réserver"],["reservations","▣","Mes réservations"],["profile","◎","Mon profil"]],
  driver: [["dashboard","⌂","Aujourd’hui"],["missions","⇄","Mes missions"],["history","▣","Historique"],["profile","◎","Mon profil"]],
  partner: [["dashboard","⌂","Accueil"],["new-booking","＋","Nouvelle demande"],["reservations","▣","Demandes"],["pricing","₣","Ma tarification"],["profile","◎","Mon compte"]]
};

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(n){return new Intl.NumberFormat("fr-FR").format(n)+" FCFA";}
function statusBadge(s){let c=s==="Confirmée"||s==="Disponible"||s==="Actif"?"success":s==="En course"||s==="En attente"||s==="En validation"?"warning":s==="À assigner"||s==="Prospect"?"info":"danger";return `<span class="badge ${c}">${esc(s)}</span>`;}

function setPage(p){state.page=p;localStorage.setItem("sj_page",p);render();}
function setRole(r){state.role=r;localStorage.setItem("sj_role",r);state.page="dashboard";render();}

function shell(){
  const nav = navByRole[state.role] || navByRole.admin;
  const title = nav.find(x=>x[0]===state.page)?.[2] || "Vue d’ensemble";
  return `<div class="app">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">SJ</div><div><b>SENTRAJET</b><small>PREMIUM</small></div></div>
      <nav class="nav">${nav.map(x=>`<button class="${x[0]===state.page?"active":""}" onclick="setPage('${x[0]}')"><b>${x[1]}</b><span>${x[2]}</span></button>`).join("")}</nav>
      <div class="side-bottom">
        <div class="role-pill">Mode : <strong>${roleLabel(state.role)}</strong></div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar"><div><div class="crumb">SentraJet Premium / ${esc(title)}</div></div>
        <div class="top-actions"><button class="icon-btn" onclick="showToast('Notifications à connecter')">♧</button><button class="avatar" onclick="showRoleMenu()">${state.role[0].toUpperCase()}</button></div>
      </header>
      <div class="content">${page()}</div>
      <nav class="mobile-nav">${nav.slice(0,4).map(x=>`<button class="${x[0]===state.page?"active":""}" onclick="setPage('${x[0]}')">${x[1]}<br><small>${x[2].split(" ")[0]}</small></button>`).join("")}</nav>
    </main>
    ${state.modal ? modal() : ""}
  </div>`;
}
function roleLabel(r){return ({admin:"Direction",client:"Client",driver:"Chauffeur",partner:"Partenaire"})[r]||r;}

function page(){
  switch(state.page){
    case "dashboard": return dashboard();
    case "reservations": return reservations();
    case "dispatch": return dispatch();
    case "drivers": return drivers();
    case "partners": return partners();
    case "clients": return clients();
    case "fleet": return fleet();
    case "pricing": return pricing();
    case "reports": return reports();
    case "settings": return settings();
    case "new-booking": return booking();
    case "missions": return missions();
    case "history": return history();
    case "profile": return profile();
    default: return dashboard();
  }
}

function dashboard(){
  if(state.role==="client") return clientHome();
  if(state.role==="driver") return driverHome();
  if(state.role==="partner") return partnerHome();
  return `<div class="hero"><section class="hero-card"><div class="hero-art"></div><div class="hero-copy"><div class="eyebrow">Mobility control center</div><h1>Votre flotte, vos réservations, votre service.</h1><p>Un cockpit unique pour piloter les clients, chauffeurs, partenaires, tarifs, véhicules et opérations SentraJet Premium.</p><button class="btn primary" onclick="setPage('reservations')">Voir les réservations</button></div></section>
  <section class="hero-stats"><div class="stat"><div class="muted">Réservations aujourd’hui</div><div class="num">18</div><div class="gold">+12% vs hier</div></div><div class="stat"><div class="muted">Chauffeurs disponibles</div><div class="num">07</div><div class="gold">Sur 12 actifs</div></div><div class="stat"><div class="muted">CA du jour</div><div class="num">685k</div><div class="gold">FCFA</div></div><div class="stat"><div class="muted">Partenaires actifs</div><div class="num">14</div><div class="gold">B2B</div></div></section></div>
  <div class="grid grid-4">${[
    ["Réservations à traiter","06","À assigner","▣"],["Courses en cours","04","En temps réel","⇄"],["Véhicules disponibles","08","Prêts à partir","▤"],["Demandes partenaires","09","À confirmer","◈"]
  ].map(x=>`<div class="card"><div class="between"><div><div class="muted">${x[0]}</div><div class="metric">${x[1]}</div><div class="metric-sub">${x[2]}</div></div><div class="kpi-icon">${x[3]}</div></div></div>`).join("")}</div>
  <div class="section-head"><h2>Opérations du jour</h2><button class="btn ghost" onclick="setPage('dispatch')">Ouvrir le dispatch →</button></div>
  <div class="grid grid-2"><div class="card"><h3>Prochaines prises en charge</h3><div class="list">${state.reservations.map(r=>`<div class="row"><div class="row-left"><div class="dot ${r.status==="À assigner"?"warn":""}"></div><div><b>${esc(r.type)}</b><div class="muted">${esc(r.client)} · ${r.time}</div></div></div><div>${statusBadge(r.status)}</div></div>`).join("")}</div></div>
  <div class="card"><h3>Disponibilité chauffeurs</h3><div class="list">${state.drivers.slice(0,4).map(d=>`<div class="row"><div class="row-left"><div class="avatar" style="width:34px;height:34px">${d.name[0]}</div><div><b>${esc(d.name)}</b><div class="muted">${esc(d.vehicle)}</div></div></div>${statusBadge(d.status)}</div>`).join("")}</div></div></div>`;
}

function clientHome(){return `<div class="section-head"><h2>Bonjour 👋</h2><button class="btn primary" onclick="setPage('new-booking')">+ Réserver un trajet</button></div><div class="hero"><section class="hero-card"><div class="hero-art"></div><div class="hero-copy"><div class="eyebrow">SentraJet Premium</div><h1>Réservez votre trajet en toute sérénité.</h1><p>Transfert AIBD, trajet interurbain ou mise à disposition avec chauffeur professionnel.</p><button class="btn primary" onclick="setPage('new-booking')">Nouvelle réservation</button></div></section><section class="hero-stats"><div class="stat"><div class="muted">Réservations à venir</div><div class="num">03</div></div><div class="stat"><div class="muted">Dernier trajet</div><div class="num">25k</div><div class="gold">FCFA</div></div></section></div><div class="section-head"><h2>Mes prochaines réservations</h2></div>${reservationTable(state.reservations.slice(0,3))}`}

function partnerHome(){return `<div class="section-head"><div><div class="eyebrow">Partenaire B2B</div><h2>Votre espace partenaire</h2></div><button class="btn primary" onclick="setPage('new-booking')">+ Nouvelle demande</button></div><div class="grid grid-4">${[["Tarif AIBD","20 000 F","1–2 passagers"],["Tarif interurbain","700 F/km","Net partenaire"],["Demandes ouvertes","04","À confirmer"],["Marge libre","Votre prix","Refacturation client"]].map(x=>`<div class="card"><div class="muted">${x[0]}</div><div class="metric">${x[1]}</div><div class="metric-sub">${x[2]}</div></div>`).join("")}</div><div class="section-head"><h2>Demandes récentes</h2></div>${reservationTable(state.reservations)}`}

function driverHome(){return `<div class="section-head"><div><div class="eyebrow">Espace chauffeur</div><h2>Votre journée</h2></div><button class="btn" onclick="showToast('Statut mis à jour')">Je suis disponible</button></div><div class="grid grid-3"><div class="card"><div class="muted">Mission suivante</div><div class="metric">14:30</div><div class="metric-sub">AIBD → Dakar · 4 passagers</div></div><div class="card"><div class="muted">Courses aujourd’hui</div><div class="metric">05</div><div class="metric-sub">04 terminées</div></div><div class="card"><div class="muted">Véhicule</div><div class="metric">Starex</div><div class="metric-sub">Disponible</div></div></div><div class="section-head"><h2>Mes missions</h2></div>${reservationTable(state.reservations)}`}

function reservationTable(rows){
 return `<div class="card"><div class="toolbar"><div class="search"><input placeholder="Rechercher une réservation..." oninput="filterTable(this.value)"></div><button class="btn" onclick="openModal('booking')">+ Réservation</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Client</th><th>Prestation</th><th>Date</th><th>Passagers</th><th>Chauffeur</th><th>Statut</th><th>Montant</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.id}</b></td><td>${esc(r.client)}</td><td>${esc(r.type)}</td><td>${r.date}<br><span class="muted">${r.time}</span></td><td>${r.pax}</td><td>${esc(r.driver)}</td><td>${statusBadge(r.status)}</td><td><b>${r.price}</b></td></tr>`).join("")}</tbody></table></div></div>`;
}
function reservations(){return `<div class="section-head"><div><div class="eyebrow">Operations</div><h2>Réservations</h2></div><button class="btn primary" onclick="openModal('booking')">+ Nouvelle réservation</button></div>${reservationTable(state.reservations)}`}
function dispatch(){return `<div class="section-head"><div><div class="eyebrow">Dispatch</div><h2>Centre d’affectation</h2></div><button class="btn" onclick="showToast('Actualisation effectuée')">↻ Actualiser</button></div><div class="grid grid-2"><div class="card"><h3>À assigner</h3><div class="list">${state.reservations.filter(r=>r.status==="À assigner").map(r=>`<div class="row"><div><b>${r.id} · ${r.type}</b><div class="muted">${r.date} · ${r.time} · ${r.pax} passagers</div></div><button class="btn primary" onclick="openModal('assign')">Affecter</button></div>`).join("") || '<div class="empty">Aucune course à assigner.</div>'}</div></div><div class="card"><h3>Chauffeurs disponibles</h3><div class="list">${state.drivers.filter(d=>d.status==="Disponible").map(d=>`<div class="row"><div><b>${d.name}</b><div class="muted">${d.vehicle}</div></div>${statusBadge(d.status)}</div>`).join("")}</div></div></div>`}
function drivers(){return `<div class="section-head"><div><div class="eyebrow">Ressources</div><h2>Chauffeurs</h2></div><button class="btn primary" onclick="openModal('driver')">+ Ajouter</button></div><div class="grid grid-4">${state.drivers.map(d=>`<div class="card"><div class="between"><div class="avatar">${d.name[0]}</div>${statusBadge(d.status)}</div><h3 style="margin-top:14px">${esc(d.name)}</h3><div class="muted">${esc(d.vehicle)}</div><div class="metric-sub">${d.trips} courses ce mois</div></div>`).join("")}</div>`}
function partners(){return `<div class="section-head"><div><div class="eyebrow">Réseau</div><h2>Partenaires</h2></div><button class="btn primary" onclick="openModal('partner')">+ Partenaire</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Partenaire</th><th>Société</th><th>Statut</th><th>Tarification</th><th>Action</th></tr></thead><tbody>${state.partners.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.company)}</td><td>${statusBadge(p.status)}</td><td>${esc(p.tariff)}</td><td><button class="btn" onclick="showToast('Fiche partenaire ouverte')">Voir</button></td></tr>`).join("")}</tbody></table></div></div>`}
function clients(){return `<div class="section-head"><div><div class="eyebrow">CRM</div><h2>Clients</h2></div><button class="btn primary" onclick="openModal('client')">+ Client</button></div><div class="grid grid-3">${["Mme Gueye","Entreprise ABC","Sakina Conciergerie"].map((n,i)=>`<div class="card"><div class="flex"><div class="avatar">${n[0]}</div><div><b>${n}</b><div class="muted">${i===2?"Partenaire B2B":"Client direct"}</div></div></div><div class="section-head" style="margin:16px 0 0"><span class="muted">Réservations</span><b>${[7,3,18][i]}</b></div></div>`).join("")}</div>`}
function fleet(){return `<div class="section-head"><div><div class="eyebrow">Assets</div><h2>Flotte</h2></div><button class="btn primary" onclick="showToast('Module véhicule à connecter à Supabase')">+ Véhicule</button></div><div class="grid grid-3">${[["Hyundai Starex","10–11 places","Disponible"],["Mercedes Vito","7–8 places","En course"],["Kia Carnival","7 places","Disponible"]].map(v=>`<div class="card"><div class="between"><h3>${v[0]}</h3>${statusBadge(v[2])}</div><div class="muted">${v[1]}</div><div class="section-head" style="margin:18px 0 0"><span class="muted">Climatisation</span><b>Oui</b></div><div class="section-head" style="margin:8px 0 0"><span class="muted">Chauffeur</span><b>Assignable</b></div></div>`).join("")}</div>`}
function pricing(){return `<div class="section-head"><div><div class="eyebrow">Rules Engine</div><h2>Tarification paramétrable</h2></div><button class="btn primary" onclick="openModal('price')">+ Règle</button></div><div class="grid grid-2"><div class="card"><h3>Client direct</h3><div class="list">${[["AIBD 1–2","25 000 FCFA"],["AIBD 3–5","30 000 FCFA"],["AIBD 6–8","40 000 FCFA"],["AIBD 9–11","50 000 FCFA"],["Interurbain >50 km","850 FCFA/km"]].map(x=>`<div class="row"><span>${x[0]}</span><b class="gold">${x[1]}</b></div>`).join("")}</div></div><div class="card"><h3>Partenaire B2B validé</h3><div class="list">${[["AIBD 1–2","20 000 FCFA"],["AIBD 3–5","25 000 FCFA"],["AIBD 6–8","30 000 FCFA"],["AIBD 9–11","40 000 FCFA"],["Interurbain >50 km","700 FCFA/km"]].map(x=>`<div class="row"><span>${x[0]}</span><b class="gold">${x[1]}</b></div>`).join("")}</div></div></div><div class="card" style="margin-top:16px"><h3>Règles opérationnelles</h3><div class="grid grid-3"><div><div class="muted">Attente</div><b>30 min gratuites</b><div class="metric-sub">Puis 2 500 F / 30 min</div></div><div><div class="muted">Mise à disposition B2B</div><b>25 000 F + 700 F/km</b></div><div><div class="muted">Annulation</div><b>30% / 50% selon délai</b></div></div></div>`}
function reports(){return `<div class="section-head"><div><div class="eyebrow">Pilotage</div><h2>Rapports</h2></div><button class="btn" onclick="showToast('Export CSV à connecter')">Exporter</button></div><div class="grid grid-4">${[["CA brut","8 420 000 F"],["Courses","126"],["Panier moyen","66 825 F"],["Taux de service","96,4 %"]].map(x=>`<div class="card"><div class="muted">${x[0]}</div><div class="metric">${x[1]}</div></div>`).join("")}</div><div class="card" style="margin-top:16px"><h3>Lecture opérationnelle</h3><div class="list">${["AIBD représente 31% des réservations.","Les partenaires B2B génèrent 42% du volume.","Le créneau 06h–10h est le plus chargé.","7 chauffeurs sont disponibles aujourd’hui."].map(x=>`<div class="row"><span>${x}</span><span class="gold">→</span></div>`).join("")}</div>`}
function settings(){return `<div class="section-head"><div><div class="eyebrow">Administration</div><h2>Paramètres</h2></div></div><div class="grid grid-2"><div class="card"><h3>Identité SentraJet</h3><div class="form"><div class="field"><label>Nom</label><input value="SentraJet Premium"></div><div class="field"><label>Contact WhatsApp</label><input value="+221 78 832 40 69"></div><div class="field"><label>Zone principale</label><input value="Dakar & Sénégal"></div><button class="btn primary" onclick="showToast('Paramètres enregistrés en démo')">Enregistrer</button></div></div><div class="card"><h3>Accès & rôles</h3><div class="list">${["Direction / Admin","Chauffeur","Client","Partenaire B2B"].map((x,i)=>`<div class="row"><span>${x}</span><span class="badge info">${["Tout","Missions","Réservations","Tarifs B2B"][i]}</span></div>`).join("")}</div></div></div>`}
function booking(){return `<div class="section-head"><div><div class="eyebrow">${state.role==="partner"?"Demande partenaire":"Réservation"}</div><h2>Nouvelle réservation</h2></div></div><div class="card"><div class="form"><div class="form-grid"><div class="field"><label>Départ</label><input placeholder="Ex. Dakar Centre"></div><div class="field"><label>Destination</label><input placeholder="Ex. AIBD / Mbour / Saly"></div><div class="field"><label>Date</label><input type="date"></div><div class="field"><label>Heure</label><input type="time"></div><div class="field"><label>Passagers</label><input type="number" min="1" max="11" value="1"></div><div class="field"><label>Type</label><select><option>Transfert simple</option><option>Aéroport + retour</option><option>Trajet interurbain</option><option>Mise à disposition</option><option>Groupe / événement</option></select></div></div><div class="field"><label>Notes</label><textarea rows="3" placeholder="Bagages, vol, arrêts, besoins particuliers..."></textarea></div><button class="btn primary" onclick="createBooking()">Calculer & envoyer la demande</button></div></div>`}
function missions(){return driverHome()}
function history(){return `<div class="section-head"><h2>Historique des courses</h2></div>${reservationTable(state.reservations)}`}
function profile(){return `<div class="section-head"><h2>Mon profil</h2></div><div class="card"><div class="form-grid"><div class="field"><label>Nom</label><input value="${state.role==="partner"?"Sakina Conciergerie":"Utilisateur SentraJet"}"></div><div class="field"><label>Téléphone</label><input value="+221 78 832 40 69"></div><div class="field"><label>E-mail</label><input value="contact@sentrajet.com"></div><div class="field"><label>Rôle</label><input value="${roleLabel(state.role)}" disabled></div></div><button class="btn primary" style="margin-top:14px" onclick="showToast('Profil enregistré en démo')">Enregistrer</button></div>`}

function modal(){
  let body="";
  if(state.modal==="booking") body=booking();
  if(state.modal==="assign") body=`<div class="form"><div class="field"><label>Chauffeur</label><select>${state.drivers.filter(d=>d.status==="Disponible").map(d=>`<option>${d.name} — ${d.vehicle}</option>`).join("")}</select></div><button class="btn primary" onclick="closeModal();showToast('Chauffeur affecté')">Confirmer l’affectation</button></div>`;
  if(state.modal==="driver") body=`<div class="form-grid"><div class="field"><label>Nom</label><input></div><div class="field"><label>Téléphone</label><input></div><div class="field"><label>Véhicule</label><input></div><div class="field"><label>Statut</label><select><option>Disponible</option><option>Hors ligne</option></select></div></div><button class="btn primary" style="margin-top:14px" onclick="closeModal();showToast('Chauffeur ajouté en démo')">Ajouter</button>`;
  if(state.modal==="partner") body=`<div class="form-grid"><div class="field"><label>Nom commercial</label><input></div><div class="field"><label>Société</label><input></div><div class="field"><label>Contact</label><input></div><div class="field"><label>Statut</label><select><option>En validation</option><option>Actif</option></select></div></div><button class="btn primary" style="margin-top:14px" onclick="closeModal();showToast('Partenaire créé en démo')">Créer</button>`;
  if(state.modal==="price") body=`<div class="form-grid"><div class="field"><label>Segment</label><select><option>Client direct</option><option>Partenaire B2B</option></select></div><div class="field"><label>Type de règle</label><select><option>Par km</option><option>Forfait</option><option>Par passagers</option></select></div><div class="field"><label>Valeur</label><input placeholder="700"></div><div class="field"><label>Unité</label><select><option>FCFA/km</option><option>FCFA</option></select></div></div><button class="btn primary" style="margin-top:14px" onclick="closeModal();showToast('Règle tarifaire enregistrée en démo')">Enregistrer</button>`;
  return `<div class="modal-back" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-head"><h2>${state.modal==="assign"?"Affecter une mission":state.modal==="price"?"Nouvelle règle tarifaire":"Créer"}</h2><button class="icon-btn" onclick="closeModal()">×</button></div>${body}</div></div>`;
}
function openModal(x){state.modal=x;render()} function closeModal(){state.modal=null;render()}
function createBooking(){state.reservations.unshift({id:"SJ-"+(1045+state.reservations.length),client:state.role==="partner"?"Sakina Conciergerie":"Nouveau client",type:"Nouvelle demande",date:"À confirmer",time:"À confirmer",pax:1,driver:"À assigner",status:"À assigner",price:"Sur devis"});state.modal=null;showToast("Demande créée — à confirmer");render();}
function showToast(msg){let t=document.createElement("div");t.textContent=msg;t.style.cssText="position:fixed;right:20px;bottom:20px;background:#102238;border:1px solid #30445e;color:#fff;padding:12px 16px;border-radius:12px;z-index:100;box-shadow:0 15px 40px rgba(0,0,0,.35)";document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function showRoleMenu(){const roles=[["admin","Direction"],["client","Client"],["driver","Chauffeur"],["partner","Partenaire B2B"]];state.modal="role";render();setTimeout(()=>{const m=document.querySelector(".modal");if(m)m.innerHTML=`<div class="modal-head"><h2>Changer d’espace</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="list">${roles.map(r=>`<button class="btn" style="text-align:left" onclick="setRole('${r[0]}')">${r[1]}</button>`).join("")}</div>`},0)}
function filterTable(v){/* hook for server-side filtering later */}
function render(){document.getElementById("app").innerHTML=shell()}
render();
