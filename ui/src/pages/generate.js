import React, { useEffect, useState } from "react";
import Dropzone from "@components/components/Dropzone";
import Dropdown from "@components/components/Dropdown";
import { AVAILABLE_MODELS, SOURCE_LANGUAGES } from "@components/constants";
import { ToastContainer, toast } from "react-toastify";
import SubtitleEditor from "@components/components/SubtitleEditor";
import useLocalStorage from "@components/hooks/useLocalStorage";
import { useRouter } from "next/router";
import { IconLink } from "@tabler/icons-react";
import { handleTranscribe } from "@components/utils";

export default function dashboard() {
  const [uploadedFile, setUploadedFile] = useState();
  const [targetLanguage, setTargetLanguage] = useState();
  const [selectedModel, setSelectedModel] = useState();
  const [youtubeLink, setYoutubeLink] = useState();
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState();
  const [disabled, setDisabled] = useState(true);
  const [transcribed, setTranscribed] = useState([]);
  const [requestSentToAPI, setrequestSentToAPI] = useState(false);
  const [isLocalFile, setIsLocalFile] = useState(false);
  const [isSubtitleBeingGenerated, setIsSubtitleBeingGenerated] =
    useState(false);

  const router = useRouter();
  const index = router.query.id;

  const handleInputChange = (event) => {
    const value = event.target.value;
    setYoutubeLink(value);
  };
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("file"));
    if (index && items) {
      if (items[index]) {
        const item = items[index];
        setDisabled(true);
        setUploadedFile(item.uploadedFile);
        setTargetLanguage(item.targetLanguage);
        setTranscribed(item.transcribedData);
        setUploadedFile({
          path: item.filename,
          size: item.size,
        });
        setIsLocalFile(true);
        setSelectedModel(item.model);
        setTargetLanguage(item.targetLanguage ?? item.outputLanguage);
      }
    }
  }, [index]);

  useEffect(() => {
    if ((uploadedFile || youtubeLink) && targetLanguage && !isLocalFile) {
      setDisabled(false);
    } else setDisabled(true);
  }, [uploadedFile, targetLanguage, youtubeLink]);

  function storeFileToLocalStorage(file) {
    const items = JSON.parse(localStorage.getItem("file"));
    if (!items) {
      localStorage.setItem("file", JSON.stringify([file]));
    } else {
      items.push(file);
      localStorage.setItem("file", JSON.stringify(items));
    }
  }

  function reset(state) {
    setDisabled(state);
    setrequestSentToAPI(state);
  }
  async function getYoutubeLinkTitle() {
    const title = fetch(
      `https://noembed.com/embed?dataType=json&url=${youtubeLink}`
    )
      .then((res) => res.json())
      .then((data) => data.title);
    return title;
  }
  async function handleSubmit() {
    if (uploadedFile && youtubeLink)
      return toast.error("Cannot upload both file and youtube link");
    reset(true);

    const { url, requestData } = await handleTranscribe(
      uploadedFile,
      youtubeLink,
      targetLanguage,
      selectedModel
    );

    const toastId = toast.info("Uploading file..");
    fetch(url, {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        toast.update(toastId, { render: "Transcribing file..", type: "info" });
        const decoder = new TextDecoder();
        const reader = res.body.getReader();
        setrequestSentToAPI(false);

        while (true) {
          const { done, value } = await reader.read();
          setIsSubtitleBeingGenerated(!done);
          if (done) break;
          try {
            const decodedValue = decoder.decode(value);
            const jsonData = JSON.parse(decodedValue);
            console.log(jsonData);
            setTranscribed((transcribed) => [...transcribed, jsonData]);
          } catch (error) {
            console.log("error in transcribing: ", error);
            const jsonString = decoder.decode(value);
            const jsonObjects = jsonString.match(/({[^{}]+})/g);
            const parsedObjects = jsonObjects.map((objString) =>
              JSON.parse(objString)
            );
            console.log("error handled");
            setTranscribed((transcribed) => [...transcribed, ...parsedObjects]);
          }
        }
      })
      .then(async () => {
        toast.update(toastId, {
          render: "Succesfully transcribed",
          type: "success",
        });

        console.log(transcribed);

        const filename = await getYoutubeLinkTitle();

        const file = {
          filename: uploadedFile?.path ?? filename,
          size: uploadedFile.size,
          transcribedData: transcribed,
          uploadDate: new Date(),
          model: selectedModel,
          targetLanguage: targetLanguage,
        };
        storeFileToLocalStorage(file);

        reset(false);
      })
      .catch((err) => console.log("error: ", err));

    console.log(transcribed);
  }

  return (
    <>
      <ToastContainer />
      <main className="flex flex-col md:flex-row md:mb-8 xl:mx-14 mx-4 gap-4">
        <aside className="w-full md:w-[30%] lg:w-[25%] flex flex-col space-y-10 p-2">
          <div>
            <h2 className="text-3xl font-medium">Upload a File</h2>
            <p className="font-xl text-gray-500 font-medium mt-2">
              Upload an audio file to generate subtitles
            </p>
          </div>
          <div className="h-60">
            <Dropzone
              setUploadedFile={setUploadedFile}
              uploadedFile={uploadedFile}
            />
          </div>

          <div className="divider font-medium">OR</div>
          <label className="flex border-2 rounded-lg gap-2 p-2 ">
            <IconLink color="grey" />
            <input
              onChange={handleInputChange}
              type="text"
              className="w-full outline-none "
              placeholder="Paste YouTube Video Link"
            />
          </label>
          <div className="space-y-5">
            <Dropdown
              onChange={(item) => setSelectedModel(item)}
              label="Model"
              options={AVAILABLE_MODELS}
              keyName="llm-model"
              defaultOption="Select Model"
            />
            <Dropdown
              onChange={(item) => setTargetLanguage(item)}
              label="Subtitle Language"
              options={SOURCE_LANGUAGES}
              keyName="target-language"
              defaultOption="Select Language"
              selectedModel={selectedModel}
            />
          </div>
          <button
            disabled={disabled}
            onClick={handleSubmit}
            className={` ${
              disabled
                ? "bg-gray-400 hover:cursor-not-allowed"
                : "bg-primary-900 hover:cursor-pointer"
            } text-white py-2 rounded-md text-lg font-medium transition-all duration-300 flex items-center justify-center`}
          >
            Generate
          </button>
        </aside>
        <SubtitleEditor
          isBeingGenerated={isSubtitleBeingGenerated}
          transcribed={transcribed}
          setTranscribed={setTranscribed}
          filename={uploadedFile?.path}
          requestSentToAPI={requestSentToAPI}
        />
      </main>
    </>
  );
}
