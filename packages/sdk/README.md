# SDK

A small script that publishers embed to show ads and report impressions and clicks.

## Usage

```html
<script src="https://cdn.springbox.dev/web3ads.min.js"
        data-publisher-id="pub_xxx"
        data-api-url="https://springbox.dev" async></script>
```

| Attribute | Meaning |
|---|---|
| `data-publisher-id` | Your publisher ID from the creator dashboard |
| `data-api-url` | Base URL of the API (the deployed frontend) |

## What it does

1. Requests an ad for each slot and receives a signed token.
2. Renders the image or native ad.
3. Reports an impression once the ad has been visible long enough, and reports clicks.

The publisher ID is public by design. It only identifies who gets credited and cannot move funds.

## Build

```bash
npm install
npm run build      # outputs dist/web3ads.min.js
```

Host the built file on any static host (Cloudflare Pages, for example).

## Demo

This site embeds the sdk snippet. Visit to see live.

[read.springbox.dev](https://read.springbox.dev)

## License

MIT