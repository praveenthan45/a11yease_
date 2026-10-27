const $=id=>document.getElementById(id);
const login=$('admin-login'),register=$('client-register'),modeSwitch=$('auth-mode-switch'),password=$('admin-password');
function setMode(create){login.hidden=create;register.hidden=!create;$('login-title').textContent=create?'Create your workspace':'Welcome back.';$('auth-subtitle').textContent=create?'Register with your email to manage website access and keys.':'Sign in to manage your websites, payments and keys.';modeSwitch.textContent=create?'Already have an account? Sign in':'New to A11yEase? Create an account';$('login-error').hidden=true;$('register-error').hidden=true;$('login-status').textContent='';$('register-status').textContent='';(create?$('register-email'):$('login-identifier')).focus();}
modeSwitch.addEventListener('click',()=>setMode(!login.hidden));
for(const button of [ $('password-toggle'),...document.querySelectorAll('.password-toggle') ])button.addEventListener('click',()=>{const field=button.closest('.password-field').querySelector('input'),visible=field.type==='password';field.type=visible?'text':'password';button.textContent=visible?'Hide':'Show';button.setAttribute('aria-label',visible?'Hide password':'Show password');button.setAttribute('aria-pressed',String(visible));});
login.addEventListener('submit',async event=>{
  event.preventDefault();if(!login.reportValidity())return;
  const submit=login.querySelector('[type=submit]');submit.disabled=true;$('login-error').hidden=true;$('login-status').textContent='Signing in…';
  try{const response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:login.elements.identifier.value,password:password.value})});const result=await response.json();password.value='';if(!response.ok)throw new Error(result.error||'Unable to sign in.');$('login-status').textContent='Signed in. Opening your workspace…';location.replace('/admin');}
  catch(failure){$('login-error').textContent=failure.message;$('login-error').hidden=false;$('login-status').textContent='';password.focus();}
  finally{submit.disabled=false;}
});
register.addEventListener('submit',async event=>{
  event.preventDefault();if(!register.reportValidity())return;
  const submit=register.querySelector('[type=submit]'),newPassword=$('register-password');$('register-error').hidden=true;
  submit.disabled=true;$('register-status').textContent='Creating your account…';
  try{const response=await fetch('/api/auth/register',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:register.elements.email.value,password:newPassword.value})});const result=await response.json();newPassword.value='';if(!response.ok)throw new Error(result.error||'Unable to create account.');$('register-status').textContent='Account created. Opening your workspace…';location.replace('/admin');}
  catch(failure){$('register-error').textContent=failure.message;$('register-error').hidden=false;$('register-status').textContent='';}
  finally{submit.disabled=false;}
});
