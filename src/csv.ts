import { globSync } from "glob";
import { json2csv } from "json-2-csv";
import fs from "node:fs";
import path from "node:path";
import { VideoDetails } from "./types";

export default function main(id?: string, force: boolean = false) {
  var files = globSync(`${process.cwd()}/output/*/output.json`);
  if (!!id) {
    files = files.filter((f) => f.includes(id));
  }

  for (const f of files) {
    const dir = path.dirname(f);
    const ext = path.extname(f);
    const name = path.basename(f).replace(ext, "");
    const out = dir + path.sep + name + ".csv";

    if (!fs.existsSync(out) || force) {
      console.log("converting " + f);
      const vids: VideoDetails[] = JSON.parse(fs.readFileSync(f, "utf-8"));
      const csv = json2csv(vids);
      fs.writeFileSync(out, csv, "utf-8");
    } else {
      console.log(out + " exists");
    }
  }
}

if (require.main === module) {
  main();
}
