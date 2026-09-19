import React from "react";
import Card from "@/components/ui/course-design-cards";
import "@/index.css";

export const DefaultDemo: React.FC = () => {
  const cardData = [
    {
      id: 1,
      colorClass: "green",
      date: "Feb 2, 2021",
      title: "web designing",
      description: "Prototyping",
      progressPercent: "90%",
      progressValue: "90%",
      imgSrc1:
        "https://cdn.21st.dev/assets/mirror/7f/7fd6c9c03ca80e37fe8b9d2c0a7bbcb0cfc0efb7ddfee804eae550721823b005.jpg",
      imgAlt1: "User 1",
      imgSrc2:
        "https://cdn.21st.dev/assets/mirror/fa/fa7717cc596a4e9f046857063a32bf2b02e92641715dee729e2193845a3c96c3.jpg",
      imgAlt2: "User 2",
      countdownText: "2 days left",
    },
    {
      id: 2,
      colorClass: "orange",
      date: "Feb 05, 2021",
      title: "mobile app",
      description: "Shopping",
      progressPercent: "30%",
      progressValue: "30%",
      imgSrc1:
        "https://cdn.21st.dev/assets/mirror/59/5911e3cc75c7ccb3d3aa8e030ddc10a7b1a1532d82cab7be99c3bbd83ded4abb.jpg",
      imgAlt1: "User 3",
      imgSrc2:
        "https://cdn.21st.dev/assets/mirror/f3/f30731edbee626b0eb8d9947a19135e4e3a40fe631d389dd56394eeb3a91aca1.jpg",
      imgAlt2: "User 4",
      countdownText: "3 weeks left",
    },
    {
      id: 3,
      colorClass: "red",
      date: "March 03, 2021",
      title: "dashboard",
      description: "Medical",
      progressPercent: "50%",
      progressValue: "50%",
      imgSrc1:
        "https://cdn.21st.dev/assets/mirror/6c/6c74ebf6a7ebba867538b0cd8825a794ea694b8139da9956cba027e7f5207434.jpg",
      imgAlt1: "User 5",
      imgSrc2:
        "https://cdn.21st.dev/assets/mirror/10/1015230f2eaf20e3d9619739b198b48c285fef16f1f0af2a55c576bd61a56673.jpg",
      imgAlt2: "User 6",
      countdownText: "3 weeks left",
    },
    {
      id: 4,
      colorClass: "blue",
      date: "March 08, 2021",
      title: "web designing",
      description: "Wireframing",
      progressPercent: "20%",
      progressValue: "20%",
      imgSrc1:
        "https://cdn.21st.dev/assets/mirror/fe/febd67023dbd4cf096b58a7280ae6ab72e1ac7a65af8703804d2e3456821c423.jpg",
      imgAlt1: "Erik Longman",
      imgSrc2:
        "https://cdn.21st.dev/assets/mirror/fe/fe20984132fd0a93863e766e8e7374e03b971cd8eb621d44772edb75aec35c0f.jpg",
      imgAlt2: "Jane Doe",
      countdownText: "3 weeks left",
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {cardData.map((card) => (
        <Card key={card.id} data={card} />
      ))}
    </section>
  );
};

export default DefaultDemo;
