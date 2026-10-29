const $=id=>document.getElementById(id);
const login=$('admin-login'),password=$('admin-password'),passwordToggle=$('password-toggle');
passwordToggle.addEventListener('click',()=>{const visible=password.type==='password';password.type=visible?'text':'password';passwordToggle.textContent=visible?'Hide':'Show';passwordToggle.setAttribute('aria-label',visible?'Hide password':'Show password');passwordToggle.setAttribute('aria-pressed',String(visible));});
login.addEventListener('submit',async event=>{
  event.preventDefault();if(!login.reportValidity())return;
  const submit=login.querySelector('[type=submit]');submit.disabled=true;$('login-error').hidden=true;$('login-status').textContent='Signing in…';
  try{const response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:login.elements.identifier.value,password:password.value})});const result=await response.json();password.value='';if(!response.ok)throw new Error(result.error||'Unable to sign in.');$('login-status').textContent='Signed in. Opening your workspace…';location.replace('/admin');}
  catch(failure){$('login-error').textContent=failure.message;$('login-error').hidden=false;$('login-status').textContent='';password.focus();}
  finally{submit.disabled=false;}
});
