// CommonJS Passenger entry point. Deploy with the package.json beside this file.
process.env.NODE_ENV ||= 'production';
process.env.COOKIE_SECURE ||= 'true';
import('./server/admin.mjs').catch(error => {
  console.error('A11yease could not start:', error.message);
  process.exit(1);
});
