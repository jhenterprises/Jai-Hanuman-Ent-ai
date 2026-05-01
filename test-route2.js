import express from 'express';
export function testApp1() {
  const app = express();
  app.get('*all', (req, res) => res.send('app1'));
  const s1 = app.listen(3001, () => {
    fetch('http://localhost:3001/profile').then(r => r.text()).then(t => { console.log('profile:', t); process.exit(0); });
  });
}
testApp1();
