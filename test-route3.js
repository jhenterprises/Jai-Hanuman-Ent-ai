import express from 'express';
const app = express();
app.get('*all', (req, res) => res.send('app1'));
app.listen(3003, () => {
    fetch('http://localhost:3003/profile/123').then(r => r.text()).then(t => { console.log('subpath:', t); process.exit(0); });
});
