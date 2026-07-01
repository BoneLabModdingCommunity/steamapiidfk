export default async function handler(req, res) {

    const query = req.query.q;

    if (!query) {
        return res.status(400).json({
            error: "Missing query"
        });
    }

    const response = await fetch(
        `https://store.steampowered.com/search/suggest?term=${encodeURIComponent(query)}&f=games&cc=US&l=english`
    );

    const html = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(html);

}