import cluster from 'node:cluster';
import http from 'node:http';
import url from 'node:url';
import os from 'node:os';

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

const CPUs = os.cpus().length - 2;

if (cluster.isPrimary) {
    for (let i = 0; i < CPUs; i++) {
        cluster.fork();
    }
    console.log(`${CPUs} server instances listening on port 8100`);
} else {
    const text = `
        Lorem ipsum dolor sit amet, ad mel elit albucius nominati. Eos nullam erroribus ad, vim tibique eligendi ne. Vis id natum inciderint accommodare, quo ei placerat vituperata complectitur. Doming audire alterum pri no, vix an audiam option. At omnium contentiones conclusionemque est, in quo evertitur reprimique, ut nibh convenire interesset usu.
        At vix novum aliquam saperet, sit idque constituto ullamcorper ex. Tation verear vel cu, ex est sonet persius. Te sea dolore recteque, scripta prompta mea no. At duo forensibus referrentur. Quo animal senserit cu.
        Te velit aeterno referrentur mel. Usu ea duis senserit corrumpit. Ei mea quis constituto. Ex quo natum oratio quaerendum. Vel habemus imperdiet vituperatoribus an, eos porro summo error ea. Eum eirmod omittam te, ea usu tota labitur.
        Wisi efficiendi ius at, ut probo solet iracundia vim. Nec ea blandit menandri explicari. Oratio dolorem expetendis id qui, vis cibo saepe cu. Odio unum verear vis id, praesent iracundia consequuntur mei ei. In natum placerat voluptatum est, illud habemus has eu, mea id dolore nominati. Est inani decore debitis at.
        Ea vis elit maluisset, est diceret lobortis ut. Te dolorem invidunt mea, quis veniam ius ex, persius invenire est te. Cum probo integre no, pri ea dicam deterruisset. Alii malorum ut sit. Facer laudem ius ad. No gubergren instructior mel, cu nec mundi referrentur, mei tollit apeirian ex.
    `;

    http.createServer((req, res) => {
        const u = url.parse(req.url, true);

        if (u.pathname === '/manifest.json') {
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'podlet-version': '1.0.0',
            });
            res.end(
                '{ "name": "component", "version": "1.0.0", "content": "/index.html", "fallback": "/fallback.html" }',
            );
            return;
        }

        if (u.pathname === '/index.html') {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'podlet-version': '1.0.0',
            });
            res.end(`<section>Content: ${text}</section>`);
            return;
        }

        if (u.pathname === '/fallback.html') {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'podlet-version': '1.0.0',
            });
            res.end(`<section>Fallback: ${text}</section>`);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
    }).listen(8100);
}
