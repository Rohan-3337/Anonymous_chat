import { nanoid } from "nanoid";
import { useEffect, useState } from "react";



const ANIME_CHARACTERS = [
  "Naruto",
  "ITachi Uchiha",
  "Eren Yeager",
  "Tanjiro Kamado",
  "Goku",
  "Luffy",
  "Saitama",
  "Deku",
  "Obito Uchiha",
  "Hinata Hyuga",
  "Sasuke Uchiha",
  "Mikasa Ackerman",
  "Rock Lee",
  "Nezuko Kamado",
  "Sakura Haruno",
  "Kakashi Hatake",
];
const STORAGE_KEY = "username";

const generateUsername = () => {
  const word  = ANIME_CHARACTERS[Math.floor(Math.random() * ANIME_CHARACTERS.length)];
  return `${word}-${nanoid(ANIME_CHARACTERS.length)}`;
}
export const useUsername = () => {
      const [username, setUsername] = useState<string>("");
      useEffect(()=>{
        const savedUsername = localStorage.getItem(STORAGE_KEY);
        if (savedUsername) {
          setUsername(savedUsername);
        } else {
          const newUsername = generateUsername();
          setUsername(newUsername);
          localStorage.setItem(STORAGE_KEY, newUsername);
        }
      }, []);
    return { username,setUsername};
}