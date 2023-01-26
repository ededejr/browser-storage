### [browser storage | craft]

A simple prototype for generating keys and storing in the browser.

#### Usage

This is a break down of the basic functionality.

![browser-storage](https://user-images.githubusercontent.com/16638639/214872895-bf20973c-54bc-49d7-b617-6ba235cc51b5.png)

Currently stored data can also be viewed via the inspector.

<img width="1387" alt="Screenshot 2023-01-26 at 10 06 22 AM" src="https://user-images.githubusercontent.com/16638639/214874157-d5c4d561-fecb-4720-8aaf-a3b50633cae1.png">

#### Storage APIs

- Local:
  - Persists until removed, survives refresh or browser close
  - Shared across tabs/windows
- Session:
  - Persists until page/tab is destroyed, survives refresh
  - Not shared across tabs/windows

- IndexDB:
  - Persists until destroyed, survives refresh or browser close
  - Shared across tabs/windows
  - Similar to Local


#### Reference

> Built with Tailwindcss Example
> Integrate Remix with tailwindcss.
> #### Example
> This example shows how to use Tailwind CSS (v3.0) with Remix. It follows the steps outlined in the official [Remix Styling docs](https://remix.run/guides/styling#tailwind).
> Relevant files:
> 
> - [package.json](./package.json) where the tailwind CLI is used.
> - [tailwind.config.js](./tailwind.config.js) where tailwind is configured.
> - [app/root.tsx](./app/root.tsx) where tailwind is imported.
> - [.gitignore](.gitignore) where the generated tailwind.css is added to the ignore list.
>
> #### Related Links
> [Tailwind CSS](https://tailwindcss.com)
