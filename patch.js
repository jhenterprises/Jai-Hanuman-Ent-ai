import fs from 'fs';
let c = fs.readFileSync('src/pages/Login.tsx', 'utf8');
c = c.replace(
`  // Check role after login
  useEffect(() => {
    if (user) {`,
`  const logoutInitiated = React.useRef(false);

  // Check role after login
  useEffect(() => {
    if (user && !logoutInitiated.current) {`
);
c = c.replace(
`      if (type === 'admin' && user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        logout();
      } else if (type === 'user' && user.role === 'admin') {
        toast.error('Admins must use the Boss Login.');
        logout();`,
`      if (type === 'admin' && user.role !== 'admin') {
        logoutInitiated.current = true;
        toast.error('Access denied. Admin privileges required.');
        logout();
      } else if (type === 'user' && user.role === 'admin') {
        logoutInitiated.current = true;
        toast.error('Admins must use the Boss Login.');
        logout();`
);
fs.writeFileSync('src/pages/Login.tsx', c);
