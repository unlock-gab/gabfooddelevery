import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";

interface QRCodeDisplayProps {
  token: string;
  orderNumber: string;
}

export function QRCodeDisplay({ token, orderNumber }: QRCodeDisplayProps) {
  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      <CardHeader className="text-center bg-primary/5 pb-6">
        <CardTitle>Code de Livraison</CardTitle>
        <CardDescription>Commande #{orderNumber}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <QRCodeSVG value={token} size={200} level="H" />
        </div>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          Présentez ce QR code au livreur lors de la remise de votre commande.
        </p>
      </CardContent>
    </Card>
  );
}
