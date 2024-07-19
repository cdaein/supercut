import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { shuffle } from "@thi.ng/arrays/shuffle";
import { Command } from "commander";
import Ze from "dotenv";
import Fe from "kleur";
import y from "node:fs";
import v from "node:path";
import { fileURLToPath } from "node:url";
import Q from "fluent-ffmpeg";
import ie from "node:readline";
import { fileTypeFromBuffer } from "file-type";
import { shuffle as shuffle$1 } from "@thi.ng/arrays";
import { constrain, floorF } from "@daeinc/math";

var P = [
    "video/mp4",
    "video/mpeg",
    "video/mov",
    "video/avi",
    "video/x-flv",
    "video/mpg",
    "video/webm",
    "video/wmv",
    "video/3gpp",
  ],
  k =
    "You are a professional video editor who understands video timestamps and can make edits.",
  A = `Return the timestamps in the format ##:##-##:## for each section on each line. 
Only return timestamps and a short unique description in 5 to 12 words on each line. 
Do not add anything else. Do not format the response as markdown list.`;
function K(e) {
  let t = [],
    r = /[-\s]?(\d{1,2}:\d{2})-(\d{1,2}:\d{2})[-\s]?[-\s]?(.+)/g,
    n;
  for (; (n = r.exec(e)) !== null; ) {
    let [i, s, m, a] = n;
    t.push({ start: s, end: m, description: a.trim() });
  }
  return t;
}
async function T(e, t) {
  let r = await j(e);
  return !!t.find((i) => i === r);
}
async function j(e) {
  let t = y.createReadStream(e),
    r = [];
  for await (let s of t) if ((r.push(s), r.length >= 4100)) break;
  let n = Buffer.concat(r),
    i = await fileTypeFromBuffer(n);
  return i ? i.mime : "unknown";
}
function w(e, t, r = { overwrite: !1 }) {
  let n = v.dirname(e);
  if (
    (y.existsSync(n) || y.mkdirSync(n, { recursive: !0 }),
    y.existsSync(e) && !r.overwrite)
  ) {
    console.warn(
      `The file ${e} already exists. Skipping.. To overwrite the file, set { overwrite: true }.`,
    );
    return;
  }
  y.writeFileSync(e, t, "utf8");
}
function J(e) {
  return y.existsSync(e)
    ? y.lstatSync(e).isDirectory()
    : (console.log(`Path does not exist ${e}`), !1);
}
function V(e) {
  let [t, r] = e.split(":").map(Number);
  if (t < 0 || t > 59 || r < 0 || r > 59)
    throw new Error("Invalid timestamp format. Please use MM:SS.");
  return t * 60 + r;
}
var D = (e) => {
  let t = e.getTimezoneOffset();
  e.setMinutes(e.getMinutes() - t);
  let r = e.toISOString(),
    [, n, i, s, m, a, c] = r.match(
      /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
    );
  return `${n}.${i}.${s}-${m}.${a}.${c}`;
};
var { yellow: S } = Fe;
function X(e) {
  e.command("encode")
    .description("Encode videos in a directory with ffmpeg")
    .requiredOption(
      "-d, --directory <video_dir>",
      "Directory path containing videos",
    )
    .option("-w, --width <width>", "target width")
    .option("-h, --height <height>", "target height")
    .action(async (t) => {
      J(t.directory) ||
        (console.error(`Cannot handle path ${S(t.directory)}`),
        process.exit(1));
      let r = t.directory,
        n = v.join(r, "encoded");
      y.existsSync(n) || y.mkdirSync(n, { recursive: !0 });
      let i = [],
        s = new Set();
      y.readdir(r, async (m, a) => {
        if (m) {
          console.error(`Error reading video directory: ${m}`);
          return;
        }
        for (let l = 0; l < a.length; l++) {
          let d = a[l],
            f = v.join(r, d);
          if (!y.lstatSync(f).isFile()) continue;
          if (!(await T(f, P))) {
            console.log(`Not supported file type: ${S(f)}`);
            continue;
          }
          let u = await be(f);
          u &&
            (Te(s, [u.width, u.height]),
            i.push({
              filePath: d,
              width: u.width,
              height: u.height,
              aspectRatio: u.aspectRatio,
            }));
        }
        let c = Array.from(s).map((l) => l.split(",").map(Number)),
          [o, p] = Pe(c);
        t.width && (o = t.width),
          t.height && (p = t.height),
          console.log(`Encoding to target dimensions: [${o}, ${p}]`);
        for (let l = 0; l < i.length; l++) {
          let { filePath: d, width: f, height: u, aspectRatio: _ } = i[l],
            $ = v.join(r, d),
            h = v.join(n, `${d}`);
          if (y.lstatSync($).isFile()) {
            if (!(await T($, P))) {
              console.log(`Not supported format: ${S($)}`);
              continue;
            }
            try {
              let R = await new Promise((ve, $e) => {
                let O = Q($),
                  Y = f > o || u > p ? "decrease" : "increase";
                t.width && t.height
                  ? O.videoFilters(
                      `scale=${o}:${p}:force_original_aspect_ratio=increase,crop=${o}:${p}`,
                    )
                  : _ > o / p
                    ? O.videoFilters(
                        `scale=-1:${p}:force_original_aspect_ratio=${Y},pad=ceil(iw/2)*2:ceil(ih/2)*2,crop=${o}:${p},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
                      )
                    : O.videoFilters(
                        `scale=${o}:-1:force_original_aspect_ratio=${Y},pad=ceil(iw/2)*2:ceil(ih/2)*2,crop=${o}:${p},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
                      ),
                  O.output(h)
                    .videoCodec("libx264")
                    .audioCodec("aac")
                    .setDuration(3600)
                    .outputOptions(
                      "-c:v",
                      "libx264",
                      "-pix_fmt",
                      "yuv420p",
                      "-ac",
                      "2",
                      "-g",
                      "24",
                      "-keyint_min",
                      "24",
                      "-sc_threshold",
                      "0",
                    )
                    .on("start", () => {
                      console.log(`Encoding started: ${S(h)}`);
                    })
                    .on("progress", (x) => {
                      ie.cursorTo(process.stdout, 0),
                        process.stdout.write(
                          `Encoding: Frames: ${x.frames} | FPS: ${x.currentFps} | Time: ${x.timemark} | Progress: ${x.percent.toFixed(2)}%`,
                        );
                    })
                    .on("end", () => {
                      console.log(), ve("Encoding completed");
                    })
                    .on("error", (x) =>
                      $e(`Error while encoding video: ${S(h)} ${x}`),
                    )
                    .run();
              });
              console.log(R);
            } catch (R) {
              console.error(R);
            }
          }
        }
      });
    });
}
function Pe(e) {
  let t = {};
  e.forEach((i) => {
    let s = i.toString();
    t[s] = (t[s] || 0) + 1;
  });
  let r = null,
    n = 0;
  for (let [i, s] of Object.entries(t)) s > n && ((r = i), (n = s));
  return r ? r.split(",").map(Number) : [];
}
function Te(e, t) {
  let r = `${t}`;
  e.add(r);
}
async function be(e) {
  try {
    let r = (
      await new Promise((o, p) => {
        Q.ffprobe(e, (l, d) => {
          l ? p(l) : o(d);
        });
      })
    ).streams.find((o) => o.codec_type === "video");
    if (!r) throw new Error("No video stream found");
    let { width: n, height: i, r_frame_rate: s, display_aspect_ratio: m } = r,
      a;
    if (s) {
      let [o, p] = s.split("/").map(Number);
      a = o / p;
    }
    let c;
    if (m) {
      let [o, p] = m.split(":").map(Number);
      c = o / p;
    }
    return { width: n, height: i, frameRate: a, aspectRatio: c };
  } catch (t) {
    console.error(`Failed to get the video metadata of ${S(e)}`, t);
    return;
  }
}
async function oe(e) {
  e.command("cliplist")
    .description("Generate cliplist text file from directory of video files")
    .requiredOption("-d, --directory <folder_path>", "Directory of video files")
    .option("-w, --overwrite", "Overwrite existing cliplist file")
    .option("-r, --random", "Random order for clip list file")
    .option("--concat", "Create concatenated clip list as well")
    .action(async (t) => {
      await Ie(t);
    });
}
async function Ie(e) {
  let { directory: t, random: r, overwrite: n, concat: i } = e;
  y.readdir(t, async (s, m) => {
    if (s) {
      console.error(`Error reading video directory: ${s}`);
      return;
    }
    let a = m.filter((p) => p.endsWith("mp4")),
      c = Ge(a),
      o = [];
    for (let p in c) {
      let l = c[p];
      r && shuffle$1(l);
      let d = l.map((u) => `file ${u}`).join(`
`),
        f = v.join(t, `${p}-cliplist.txt`);
      w(f, d, { overwrite: n }),
        i &&
          o.push(
            ...d.split(`
`),
          );
    }
    if (i) {
      e.random && shuffle$1(o);
      let p = v.join(t, "all-cliplist.txt");
      y.writeFileSync(
        p,
        o.join(`
`),
        "utf8",
      );
    }
  });
}
function Ge(e) {
  return e.reduce((t, r) => {
    let n = r.match(/^(\d{3})-/);
    if (n) {
      let i = n[1];
      t[i] || (t[i] = []), t[i].push(r);
    }
    return t;
  }, {});
}
var { bold: Ne, red: re, yellow: L } = Fe;
function ne(e) {
  e.command("clips")
    .description("Generate video clips based on given timestamps")
    .requiredOption("-v, --video <video_file>", "Video file path")
    .requiredOption(
      "-t, --timestamps <text_file>",
      "Text file containing timestamps",
    )
    .option(
      "-b, --buffer <seconds>",
      "Add/shrink each video clip duration. positive value to increase duration on either side",
    )
    .option("-r, --random", "Write clip list in random order")
    .action((t) => {
      U(t);
    });
}
async function U(e) {
  let t = y.readFileSync(e.timestamps, "utf8"),
    r = v.dirname(e.timestamps),
    n = K(t);
  console.log(Ne(`Generating video clips... (${n.length} clips in total)`));
  let i = e.index;
  if (!i) {
    let m = v.basename(e.timestamps).match(/^\d{3}/);
    if (m) {
      let a = m[0];
      i = Number(a);
    } else
      console.error(
        `Format the timestamps file to have 3 digit index at the beginning (ex. 000) ${e.timestamps}`,
      ),
        process.exit(1);
  }
  try {
    let s = await Le(e.video, i, e.buffer, n, r);
    e.random && shuffle(s);
    let m = s.map((o) => `file ${o}`).join(`
`),
      a = `${i.toString().padStart(3, "0")}-cliplist.txt`,
      c = v.join(r, a);
    w(c, m, { overwrite: !0 }),
      console.log(`Clip list is saved to ${L(c)}
`);
  } catch (s) {
    throw new Error(`${re("Error while creating video clip:")} ${s}`);
  }
}
async function Le(e, t, r = 0, n, i) {
  return new Promise(async (s, m) => {
    let a = [],
      c = t?.toString().padStart(3, "0");
    for (let o = 0; o < n.length; o++) {
      let p = n[o],
        { start: l, end: d, description: f } = p,
        u = o.toString().padStart(3, "0"),
        _ = `${c}-${u}-${f.replace(/[\s\-!@#$%^&*()?;:,.'"]/g, "_")}.mp4`,
        $ = v.join(i, _);
      try {
        let h = await Re(e, l, d, r, $);
        a.push(_), console.log(h);
      } catch (h) {
        console.error(re("createClip()"), h), m();
      }
    }
    console.log("All clips created successfully."), s(a);
  });
}
var Re = (e, t, r, n = 0, i) => {
  let s = V(t),
    m = V(r),
    a = Math.max(1, m - s);
  n = Number(n);
  let c = constrain(s - n, 0, s + a * 0.5),
    o = Math.max(m + n, s + a * 0.5),
    p = floorF(o - c, 3);
  if (
    (n && console.log({ geminiClipDuration: a, newduration: p }), p < 1 / 120)
  )
    throw new Error(
      `Video clip duration is too small: ${p} Check the "options.buffer"`,
    );
  return new Promise((l, d) => {
    Q(e)
      .setStartTime(c)
      .setDuration(p)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions("-pix_fmt", "yuv420p", "-crf", "21", "-b:a", "192k")
      .output(i)
      .on("start", () => {})
      .on("progress", (f) => {
        ie.cursorTo(process.stdout, 0),
          process.stdout.write(
            `Video clip encoding: ${L(i)} | Progress: ${f.percent.toFixed(2)}%`,
          );
      })
      .on("end", () => {
        ie.cursorTo(process.stdout, 0),
          console.log(),
          l(`Video clip created: ${L(i)}`);
      })
      .on("error", (f) => d(`Error while encoding video: ${L(i)} ${f}`))
      .run();
  });
};
var { bold: qe, yellow: ae } = Fe;
function ce(e) {
  e.command("concat")
    .description("Concatenate video clips into one")
    .requiredOption("-l, --clip-list <clip_list_file>", "Clip list file path")
    .action((t) => {
      let r = v.dirname(t.clipList),
        n = v.join(r, "supercut.mp4");
      q(t, n);
    });
}
async function q(e, t) {
  try {
    console.log(qe("Concatenating video clips..."));
    let r = await ze(e.clipList, t);
    console.log(r);
  } catch (r) {
    console.error(r);
  }
}
async function ze(e, t) {
  return new Promise((r, n) => {
    Q(e)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-crf 21",
        "-c:a aac",
        "-b:a 192k",
        "-preset ultrafast",
        "-movflags",
        "+faststart",
        "-shortest",
        "-af apad",
        "-avoid_negative_ts make_zero",
        "-fflags +genpts",
      ])
      .output(t)
      .on("start", () => {
        console.log(`Concatenating started: ${ae(t)}`);
      })
      .on("progress", (i) => {
        ie.cursorTo(process.stdout, 0),
          process.stdout.write(
            `Encoding: Frames: ${i.frames} | FPS: ${i.currentFps} | Time: ${i.timemark} | Progress: ${i.percent.toFixed(2)}%`,
          );
      })
      .on("end", () => {
        console.log(), r("Encoding completed");
      })
      .on("error", (i) => n(`Error while encoding video: ${ae(t)} ${i}`))
      .run();
  });
}
var { bold: E, red: me, yellow: z } = Fe;
function le(e, t, r) {
  e.command("timestamps")
    .description("Generate text response from uploaded video")
    .requiredOption("-i, --id <video_id>", "Uploaded video ID")
    .requiredOption("-p, --prompt <prompt>", "Prompt for Gemini")
    .option(
      "-m, --model <model>",
      "Gemini model to use for inference. (gemini-1.5-flash or gemini-1.5-pro)",
      "gemini-1.5-flash",
    )
    .action((n) => {
      H(n, t, r, !0);
    });
}
async function H(e, t, r, n) {
  let i = e.promptPrepend || k,
    s = e.promptAppend || A,
    m = e.outputPath || `output/${D(new Date())}`,
    a = t.getGenerativeModel({ model: e.model }),
    c;
  try {
    (c = await r.getFile(e.id)),
      console.log(`Retrieved file ${z(c.displayName)} as ${z(c.uri)}
`),
      n &&
        (i &&
          console.log(`${E("Prepended prompt")}
${i}`),
        console.log(`${E("User prompt:")}`),
        console.log(e.prompt),
        s &&
          console.log(`${E("Appended prompt:")}
${s}
`));
  } catch (o) {
    throw new Error(`${me("Error while getting file from Google:")} ${o}`);
  }
  try {
    console.log(
      E(`Waiting for Gemini response...
`),
    );
    let o = await a.generateContent([
      { fileData: { mimeType: c.mimeType, fileUri: c.uri } },
      {
        text:
          i +
          `
` +
          e.prompt +
          `
` +
          s,
      },
    ]);
    console.log(E("Response:")), console.log(o.response.text());
    let p = `${e.index.toString().padStart(3, "0")}-timestamps.txt`,
      l = v.join(m, p);
    w(l, o.response.text(), { overwrite: !0 }),
      console.log(`Response saved to ${z(l)}
`);
    let d = `${i}
${e.prompt}
${s}`;
    w(v.join(m, "prompt.txt"), d, { overwrite: !0 });
  } catch (o) {
    throw new Error(`${me("Error while generating Gemini response:")} ${o}`);
  }
}
function de(e, t) {
  e.command("list-files")
    .description("See the list of files uploaded to Google")
    .option("-n, --num <value>", "How many videos to display", "100")
    .action(async (r) => {
      let n = Number(r.num),
        i = 0,
        s = Math.min(n, 100),
        m = await t.listFiles({ pageSize: s });
      console.log(m.files), (i += m.files.length);
      let a = m.nextPageToken;
      for (; a && i < n; ) {
        let c = n - i;
        s = Math.min(c, 100);
        let o = await t.listFiles({ pageToken: a, pageSize: s });
        console.log(o.files), (i += o.files.length), (a = o.nextPageToken);
      }
      console.log(`Found ${i} files.`);
    });
}
var { bold: ue, red: ge, yellow: F } = Fe;
function he(e, t) {
  e.command("upload")
    .description(
      "Upload a video file to Google cloud to use with Gemini inference",
    )
    .requiredOption("-v, --video <video_filepath>", "Video to upload")
    .action((r) => {
      B(r, t);
    });
}
async function B(e, t) {
  let r = await t.listFiles({ pageSize: 100 }),
    { files: n } = r,
    i = v.basename(e.video),
    s = await j(e.video),
    m = y.statSync(e.video).size.toString(),
    a = n.find((o) => o.displayName === i && o.sizeBytes === m);
  if (a) {
    let { displayName: o, name: p, uri: l } = a;
    return (
      console.log(`File ${F(o)} is found as ${F(l)}
`),
      p
    );
  }
  console.log(
    ue(`Uploading video ${F(i)}
`),
  );
  let c = "";
  try {
    c = (await t.uploadFile(e.video, { mimeType: s, displayName: i })).file
      .name;
  } catch (o) {
    console.error(ge("Error while uploading file")),
      o instanceof Error && (console.log(o.name), console.log(o.message));
  }
  try {
    let o = await t.getFile(c);
    for (
      process.stdout.write(ue(`Checking video state ${F(i)}`));
      o.state === FileState.PROCESSING;

    )
      await new Promise((p) => setTimeout(p, 1e4)),
        (o = await t.getFile(c)),
        process.stdout.write(".");
    if (
      (process.stdout.write(`
`),
      o.state === FileState.FAILED)
    )
      throw new Error("Video processing failed.");
    console.log(`File ${F(o.displayName)} is uploaded and ready for inference as ${F(o.uri)}
`);
  } catch (o) {
    console.error(ge("Error while verifying upload")),
      o instanceof Error && (console.log(o.name), console.log(o.message));
  }
  return c;
}
var { blue: ot, bold: I, red: yo, yellow: ye } = Fe,
  g = new Command(),
  it = v.dirname(fileURLToPath(import.meta.url)),
  rt = v.dirname(it);
Ze.config({ path: v.join(rt, ".env") });
var W = process.env.GEMINI_API_KEY;
W === void 0 &&
  (console.error(
    "Error: GEMINI_API_KEY is not provided. Create `.env` file and add the API key.",
  ),
  process.exit(1));
var we = new GoogleGenerativeAI(W),
  G = new GoogleAIFileManager(W);
g.command("main")
  .description("Main command")
  .requiredOption("-v, --video <filepaths...>", "Video file paths")
  .requiredOption("-p, --prompt <text>", "Text prompt to send Gemini")
  .option("-pp, --prompt-prepend <prompt>", "Prompt to prepend")
  .option("-pa, --prompt-append <prompt>", "Prompt to append")
  .option(
    "-b, --buffer <seconds>",
    "Add/shrink each video clip duration. positive value to increase duration on either side.",
  )
  .option(
    "-m, --model <model>",
    "Gemini model to use for inference.",
    "gemini-1.5-flash",
  )
  .option("-r, --random", "Concatenate clips in random order")
  .action(async (e) => {
    let t = `output/${D(new Date())}`;
    y.existsSync(t) || y.mkdirSync(t, { recursive: !0 });
    let r = e.promptPrepend || k,
      n = e.promptAppend || A;
    r &&
      console.log(`${I("Prepended prompt")}
${r}`),
      console.log(`${I("User prompt:")}`),
      console.log(e.prompt),
      n &&
        console.log(`${I("Appended prompt:")}
${n}
`);
    for (let a = 0; a < e.video.length; a++) {
      let c = e.video[a];
      if (!y.lstatSync(c).isFile()) {
        console.log(`Not a file: ${ye(c)}`);
        continue;
      }
      if (!(await T(c, P))) {
        console.log(`Not supported file type: ${ye(c)}`);
        continue;
      }
      console.log(I(ot(`Processing ${a + 1} of ${e.video.length} videos`)));
      let o = "",
        p = "";
      try {
        p = await B({ video: c }, G);
      } catch (l) {
        console.error("Error while uploading video:", l);
      }
      o = c;
      try {
        await H({ ...e, id: p, index: a, outputPath: t }, we, G, !1);
      } catch (l) {
        console.error(l);
        continue;
      }
      try {
        await U({
          video: o,
          index: a,
          buffer: e.buffer,
          timestamps: v.join(
            t,
            `${a.toString().padStart(3, "0")}-timestamps.txt`,
          ),
          random: e.random,
        });
      } catch (l) {
        console.error(l);
        continue;
      }
    }
    let i = [];
    try {
      (await y.promises.readdir(t))
        .filter((c) => c.endsWith("cliplist.txt"))
        .forEach((c) => {
          let p = y.readFileSync(v.join(t, c), "utf8").split(/\r?\n/);
          i.push(...p);
        });
    } catch {
      console.error("Error while reading output directory");
    }
    e.random && shuffle(i);
    let s = v.join(t, "all-cliplist.txt");
    y.writeFileSync(
      s,
      i.join(`
`),
      "utf8",
    );
    let m = v.join(t, "supercut.mp4");
    await q({ clipList: s }, m),
      console.log(
        I(`Done
`),
      );
  });
he(g, G);
le(g, we, G);
ne(g);
ce(g);
X(g);
de(g, G);
oe(g);
g.parse(process.argv);
